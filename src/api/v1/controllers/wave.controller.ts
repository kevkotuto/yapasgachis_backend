import { Request, Response } from 'express';

import {
  InitiateWavePaymentInput,
  GetWavePaymentStatusInput,
} from '@/api/v1/validators/wave.validator';
import waveService from '@/infrastructure/payment/wave.service';
import { asyncHandler, AppError } from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';
import { prisma } from '@/infrastructure/database/prisma';
import config from '@/config';

/**
 * Wave Payment Controller
 * Handles Wave payment initiation, status checks, and webhooks
 */
export class WaveController {
  /**
   * Initiate Wave payment
   * POST /api/v1/payments/wave/initiate
   */
  initiatePayment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const body = req.body as InitiateWavePaymentInput;

    const {
      orderId,
      bookingId,
      donationId,
      amount,
      currency,
      successUrl,
      errorUrl,
    } = body;

    // Déterminer le type de transaction et l'ID de référence
    let clientReference = '';
    let transactionType = '';

    if (orderId) {
      // Vérifier que la commande existe et appartient à l'utilisateur
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new AppError(404, 'Commande non trouvée', 'ORDER_NOT_FOUND');
      }

      if (userId && order.clientId !== userId) {
        throw new AppError(
          403,
          'Accès non autorisé à cette commande',
          'UNAUTHORIZED'
        );
      }

      clientReference = `order_${orderId}`;
      transactionType = 'order';
    } else if (bookingId) {
      // Vérifier que la réservation existe et appartient à l'utilisateur
      const booking = await prisma.dealBooking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new AppError(404, 'Réservation non trouvée', 'BOOKING_NOT_FOUND');
      }

      if (userId && booking.userId !== userId) {
        throw new AppError(
          403,
          'Accès non autorisé à cette réservation',
          'UNAUTHORIZED'
        );
      }

      clientReference = `booking_${bookingId}`;
      transactionType = 'booking';
    } else if (donationId) {
      // Vérifier que la donation existe et appartient à l'utilisateur
      const donation = await prisma.donation.findUnique({
        where: { id: donationId },
      });

      if (!donation) {
        throw new AppError(404, 'Donation non trouvée', 'DONATION_NOT_FOUND');
      }

      if (userId && donation.donorId !== userId) {
        throw new AppError(
          403,
          'Accès non autorisé à cette donation',
          'UNAUTHORIZED'
        );
      }

      clientReference = `donation_${donationId}`;
      transactionType = 'donation';
    }

    // Créer le checkout Wave
    const frontendUrl = config.app.frontendUrl || 'http://localhost:3000';
    const checkout = await waveService.createCheckout({
      amount,
      currency,
      orderId: clientReference,
      successUrl: successUrl || `${frontendUrl}/payment/success`,
      errorUrl: errorUrl || `${frontendUrl}/payment/error`,
    });

    logger.info('Wave payment initiated', {
      userId,
      checkoutId: checkout.id,
      clientReference,
      transactionType,
      amount,
    });

    res.status(201).json({
      success: true,
      message: 'Paiement Wave initié avec succès',
      data: {
        checkoutId: checkout.id,
        paymentUrl: checkout.wave_launch_url,
        status: checkout.checkout_status,
        expiresAt: checkout.when_expires,
        amount: checkout.amount,
        currency: checkout.currency,
      },
    });
  });

  /**
   * Get Wave payment status
   * GET /api/v1/payments/wave/:checkoutId/status
   */
  getPaymentStatus = asyncHandler(
    async (req: Request<GetWavePaymentStatusInput>, res: Response) => {
      const { checkoutId } = req.params;

      const checkout = await waveService.getCheckoutStatus(checkoutId);

      logger.info('Wave payment status checked', {
        checkoutId,
        status: checkout.checkout_status,
        paymentStatus: checkout.payment_status,
      });

      res.json({
        success: true,
        data: {
          checkoutId: checkout.id,
          status: checkout.checkout_status,
          paymentStatus: checkout.payment_status,
          transactionId: checkout.transaction_id,
          amount: checkout.amount,
          currency: checkout.currency,
          completedAt: checkout.when_completed,
          error: checkout.last_payment_error,
        },
      });
    }
  );

  /**
   * Handle Wave webhook
   * POST /api/v1/payments/wave/webhook
   * IMPORTANT: Requires raw body for signature verification
   */
  handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-wave-signature'] as string;

    if (!signature) {
      throw new AppError(
        400,
        'Signature manquante',
        'MISSING_WEBHOOK_SIGNATURE'
      );
    }

    // Get raw body for signature verification
    // Express should preserve rawBody via middleware
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Vérifier la signature et parser le webhook
    const webhook = waveService.parseWebhook(rawBody, signature);

    if (!webhook) {
      throw new AppError(
        401,
        'Signature webhook invalide',
        'INVALID_WEBHOOK_SIGNATURE'
      );
    }

    logger.info('Wave webhook received', {
      type: webhook.type,
      checkoutId: webhook.data.id,
      clientReference: webhook.data.client_reference,
    });

    // Traiter le webhook selon le type
    switch (webhook.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(webhook);
        break;

      case 'checkout.session.payment_failed':
        await this.handleCheckoutFailed(webhook);
        break;

      case 'payout.completed':
        await this.handlePayoutCompleted(webhook);
        break;

      case 'payout.failed':
        await this.handlePayoutFailed(webhook);
        break;

      default:
        logger.warn('Unknown webhook type received', {
          type: webhook.type,
        });
    }

    // Toujours retourner 200 pour confirmer la réception
    res.status(200).json({ received: true });
  });

  /**
   * Traiter un webhook de checkout complété
   */
  private async handleCheckoutCompleted(webhook: any): Promise<void> {
    const {
      id: checkoutId,
      client_reference,
      transaction_id,
      amount,
    } = webhook.data;

    if (!client_reference) {
      logger.error('Checkout completed without client_reference', {
        checkoutId,
      });
      return;
    }

    // Parser la référence client (format: "order_uuid", "booking_uuid", "donation_uuid")
    const [type, entityId] = client_reference.split('_');

    try {
      if (type === 'order') {
        // Mettre à jour la commande
        await prisma.order.update({
          where: { id: entityId },
          data: {
            status: 'PAID',
            paymentReference: transaction_id,
            paidAt: new Date(),
          },
        });

        logger.info('Order payment confirmed via webhook', {
          orderId: entityId,
          transactionId: transaction_id,
          amount,
        });
      } else if (type === 'booking') {
        // Mettre à jour la réservation
        await prisma.dealBooking.update({
          where: { id: entityId },
          data: {
            status: 'CONFIRMED',
            paymentReference: transaction_id,
            paidAt: new Date(),
          },
        });

        logger.info('Booking payment confirmed via webhook', {
          bookingId: entityId,
          transactionId: transaction_id,
          amount,
        });
      } else if (type === 'donation') {
        // Mettre à jour la donation
        await prisma.donation.update({
          where: { id: entityId },
          data: {
            status: 'COMPLETED',
            paymentReference: transaction_id,
          },
        });

        logger.info('Donation payment confirmed via webhook', {
          donationId: entityId,
          transactionId: transaction_id,
          amount,
        });
      }
    } catch (error) {
      logger.error('Failed to process checkout completed webhook', {
        checkoutId,
        client_reference,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Traiter un webhook de checkout échoué
   */
  private async handleCheckoutFailed(webhook: any): Promise<void> {
    const { id: checkoutId, client_reference, data } = webhook;

    logger.error('Checkout payment failed', {
      checkoutId,
      clientReference: client_reference,
      error: data.last_payment_error,
    });

    if (!client_reference) {
      logger.error('Checkout failed without client_reference', { checkoutId });
      return;
    }

    // Parser la référence client
    const [type, entityId] = client_reference.split('_');

    try {
      if (type === 'order') {
        // Marquer la commande comme échouée
        await prisma.order.update({
          where: { id: entityId },
          data: {
            status: 'CANCELLED',
            cancelReason: 'Paiement échoué',
          },
        });
      } else if (type === 'booking') {
        // Marquer la réservation comme échouée
        await prisma.dealBooking.update({
          where: { id: entityId },
          data: {
            status: 'CANCELLED',
            cancelReason: 'Paiement échoué',
          },
        });
      } else if (type === 'donation') {
        // Marquer la donation comme échouée
        await prisma.donation.update({
          where: { id: entityId },
          data: {
            status: 'CANCELLED',
          },
        });
      }
    } catch (error) {
      logger.error('Failed to process checkout failed webhook', {
        checkoutId,
        client_reference,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Traiter un webhook de payout complété
   */
  private async handlePayoutCompleted(webhook: any): Promise<void> {
    logger.info('Payout completed', {
      payoutId: webhook.data.id,
      amount: webhook.data.amount,
      recipient: webhook.data.recipient_mobile,
    });

    // TODO: Mettre à jour le statut du payout dans la DB si besoin
  }

  /**
   * Traiter un webhook de payout échoué
   */
  private async handlePayoutFailed(webhook: any): Promise<void> {
    logger.error('Payout failed', {
      payoutId: webhook.data.id,
      failureCode: webhook.data.failure_code,
      failureDescription: webhook.data.failure_description,
    });

    // TODO: Notifier l'admin et marquer le payout comme échoué
  }
}

export default new WaveController();
