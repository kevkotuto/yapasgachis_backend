import { Request, Response } from 'express';

import {
  InitiateWavePaymentInput,
  GetWavePaymentStatusInput,
} from '@/api/v1/validators/wave.validator';
import notificationService from '@/core/services/notification.service';
import waveService from '@/infrastructure/payment/wave.service';
import { asyncHandler, AppError } from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';
import { prisma } from '@/infrastructure/database/prisma';
import socketService from '@/infrastructure/websocket/socket.service';
import config from '@/config';
import { NotificationType, NotificationPriority } from '@/utils/enums';

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
        // Si l'order n'existe pas, vérifier si c'est peut-être un bookingId
        // (le client mobile peut avoir envoyé le mauvais champ)
        const booking = await prisma.dealBooking.findUnique({
          where: { id: orderId },
        });

        if (booking) {
          // C'est en fait un booking, pas une order
          if (userId && booking.userId !== userId) {
            throw new AppError(
              403,
              'Accès non autorisé à cette réservation',
              'UNAUTHORIZED'
            );
          }

          clientReference = `booking_${orderId}`;
          transactionType = 'booking';

          logger.warn('orderId was actually a bookingId - auto-corrected', {
            userId,
            bookingId: orderId,
          });
        } else {
          throw new AppError(404, 'Commande non trouvée', 'ORDER_NOT_FOUND');
        }
      } else {
        // C'est bien une order
        if (userId && order.clientId !== userId) {
          throw new AppError(
            403,
            'Accès non autorisé à cette commande',
            'UNAUTHORIZED'
          );
        }

        clientReference = `order_${orderId}`;
        transactionType = 'order';
      }
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
    const waveSignatureHeader = req.headers['wave-signature'] as string;

    if (!waveSignatureHeader) {
      throw new AppError(
        400,
        'Signature manquante',
        'MISSING_WEBHOOK_SIGNATURE'
      );
    }

    // Parse Wave-Signature header: "t=1639081943, v1=signature_hash"
    const signatureParts = waveSignatureHeader.split(',').reduce(
      (acc, part) => {
        const [key, value] = part.trim().split('=');
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    const timestamp = signatureParts.t;
    const signature = signatureParts.v1;

    if (!signature || !timestamp) {
      throw new AppError(
        400,
        'Format de signature invalide',
        'INVALID_SIGNATURE_FORMAT'
      );
    }

    // Get raw body for signature verification
    // Express should preserve rawBody via middleware
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const hasRawBody = !!(req as any).rawBody;

    // Construct signed payload: timestamp.rawBody (Wave format)
    const signedPayload = `${timestamp}.${rawBody}`;

    // Debug logs
    logger.info('Wave webhook signature verification', {
      timestamp,
      signature: signature.substring(0, 20) + '...',
      rawBodyLength: rawBody.length,
      signedPayloadLength: signedPayload.length,
      hasRawBody,
      rawBodyPreview: rawBody.substring(0, 100) + '...',
    });

    // Vérifier la signature et parser le webhook
    const webhook = waveService.parseWebhook(signedPayload, signature);

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
        const order = await prisma.order.update({
          where: { id: entityId },
          data: {
            status: 'PAID',
            paymentReference: transaction_id,
            paidAt: new Date(),
          },
          include: {
            client: true,
            store: {
              include: {
                supplier: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        });

        logger.info('Order payment confirmed via webhook', {
          orderId: entityId,
          transactionId: transaction_id,
          amount,
        });

        // Envoyer notification au client
        await notificationService.create({
          userId: order.clientId,
          type: NotificationType.ORDER_PAID,
          title: 'Paiement confirmé',
          message: `Votre paiement de ${amount} XOF pour la commande #${order.orderNumber} a été confirmé avec succès.`,
          data: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            amount: order.total,
            transactionId: transaction_id,
          },
          priority: NotificationPriority.HIGH,
          sendPush: true,
          sendRealtime: true,
        });

        // Envoyer notification au fournisseur
        if (order.store?.supplier?.user?.id) {
          await notificationService.create({
            userId: order.store.supplier.user.id,
            type: NotificationType.PAYMENT_RECEIVED,
            title: 'Nouveau paiement reçu',
            message: `Paiement de ${amount} XOF reçu pour la commande #${order.orderNumber}.`,
            data: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              amount: order.total,
              transactionId: transaction_id,
              clientName: `${order.client.firstName} ${order.client.lastName}`,
            },
            priority: NotificationPriority.HIGH,
            sendPush: true,
            sendRealtime: true,
          });
        }

        // Envoyer événement WebSocket
        socketService.sendToUser(order.clientId, 'order:status_update', {
          orderId: order.id,
          status: 'PAID',
          timestamp: new Date(),
        });
      } else if (type === 'booking') {
        // Mettre à jour la réservation
        const booking = await prisma.dealBooking.update({
          where: { id: entityId },
          data: {
            status: 'CONFIRMED',
            paymentReference: transaction_id,
            paidAt: new Date(),
          },
        });

        // Récupérer les données nécessaires
        const deal = await prisma.deal.findUnique({
          where: { id: booking.dealId },
          include: {
            store: {
              include: {
                supplier: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        });

        const user = await prisma.user.findUnique({
          where: { id: booking.userId },
        });

        logger.info('Booking payment confirmed via webhook', {
          bookingId: entityId,
          transactionId: transaction_id,
          amount,
        });

        if (deal && user) {
          // Envoyer notification au client
          await notificationService.create({
            userId: booking.userId,
            type: NotificationType.DEAL_BOOKING_CONFIRMED,
            title: 'Réservation confirmée',
            message: `Votre paiement de ${amount} XOF pour le bon plan "${deal.title}" a été confirmé.`,
            data: {
              bookingId: booking.id,
              dealTitle: deal.title,
              amount: booking.totalPrice,
              transactionId: transaction_id,
            },
            priority: NotificationPriority.HIGH,
            sendPush: true,
            sendRealtime: true,
          });

          // Envoyer notification au fournisseur
          if (deal.store?.supplier?.user?.id) {
            await notificationService.create({
              userId: deal.store.supplier.user.id,
              type: NotificationType.PAYMENT_RECEIVED,
              title: 'Nouvelle réservation payée',
              message: `Paiement de ${amount} XOF reçu pour le bon plan "${deal.title}".`,
              data: {
                bookingId: booking.id,
                dealTitle: deal.title,
                amount: booking.totalPrice,
                transactionId: transaction_id,
                clientName: `${user.firstName} ${user.lastName}`,
              },
              priority: NotificationPriority.HIGH,
              sendPush: true,
              sendRealtime: true,
            });
          }
        }
      } else if (type === 'donation') {
        // Mettre à jour la donation
        const donation = await prisma.donation.update({
          where: { id: entityId },
          data: {
            status: 'COMPLETED',
            paymentReference: transaction_id,
          },
          include: {
            donor: true,
            association: {
              include: {
                user: true,
              },
            },
          },
        });

        logger.info('Donation payment confirmed via webhook', {
          donationId: entityId,
          transactionId: transaction_id,
          amount,
        });

        // Envoyer notification au donateur
        await notificationService.create({
          userId: donation.donorId,
          type: NotificationType.DONATION_CONFIRMED,
          title: 'Don confirmé',
          message: `Votre don de ${amount} XOF à ${donation.association.name} a été confirmé. Merci pour votre générosité!`,
          data: {
            donationId: donation.id,
            associationName: donation.association.name,
            amount: donation.amount,
            transactionId: transaction_id,
          },
          priority: NotificationPriority.HIGH,
          sendPush: true,
          sendRealtime: true,
        });

        // Envoyer notification à l'association
        if (donation.association.user?.id) {
          await notificationService.create({
            userId: donation.association.user.id,
            type: NotificationType.PAYMENT_RECEIVED,
            title: 'Nouveau don reçu',
            message: `Don de ${amount} XOF reçu de ${donation.donor.firstName} ${donation.donor.lastName}.`,
            data: {
              donationId: donation.id,
              amount: donation.amount,
              transactionId: transaction_id,
              donorName: `${donation.donor.firstName} ${donation.donor.lastName}`,
            },
            priority: NotificationPriority.HIGH,
            sendPush: true,
            sendRealtime: true,
          });
        }
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
