import { Request, Response, RequestHandler } from 'express';

import escrowService from '@/core/services/escrow.service';
import eventService, { AppEvent } from '@/core/services/event.service';
import orderService from '@/core/services/order.service';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import waveService from '@/infrastructure/payment/wave.service';
import { AppError, asyncHandler } from '@/middleware/error-handler.middleware';

interface WaveWebhookData {
  client_reference?: string;
  transaction_id?: string;
  id?: string;
  failure_code?: string;
  failure_description?: string;
}

/**
 * Payment Controller
 * Gestion des paiements Wave (webhooks, callbacks, vérifications)
 */

/**
 * @route POST /api/v1/payments/wave/webhook
 * @desc Webhook Wave - Appelé par Wave lors d'un événement de paiement
 * @access Public (vérifié par signature)
 */
export const handleWaveWebhook: RequestHandler = (
  req: Request,
  res: Response
): void => {
  const signature = req.headers['wave-signature'] as string;
  const payload = JSON.stringify(req.body);

  // Vérifier la signature du webhook
  const webhookData = waveService.parseWebhook(payload, signature);

  if (!webhookData) {
    logger.warn('Invalid Wave webhook signature', {
      signature,
    });
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  logger.info('Wave webhook received', {
    type: webhookData.type,
    data: webhookData.data,
  });

  // Process webhook asynchronously, respond immediately
  const processWebhook = async (): Promise<void> => {
    try {
      switch (webhookData.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(webhookData.data as WaveWebhookData);
          break;

        case 'payout.completed':
          await handlePayoutCompleted(webhookData.data as WaveWebhookData);
          break;

        case 'payout.failed':
          await handlePayoutFailed(webhookData.data as WaveWebhookData);
          break;

        default:
          logger.warn('Unknown webhook type', { type: webhookData.type });
      }
    } catch (error) {
      logger.error('Webhook processing error', {
        error: (error as Error).message,
      });
    }
  };

  void processWebhook();
  res.json({ received: true });
};

/**
 * Traiter un checkout complété (paiement réussi)
 */
async function handleCheckoutCompleted(data: WaveWebhookData): Promise<void> {
  const { client_reference: orderId, transaction_id: wavePaymentId } = data;

  if (!orderId || !wavePaymentId) {
    logger.warn('Missing data in checkout.completed webhook', { data });
    return;
  }

  try {
    await escrowService.confirmPayment(orderId, wavePaymentId);
    logger.info('Payment confirmed via webhook', { orderId, wavePaymentId });
  } catch (error) {
    logger.error('Failed to confirm payment from webhook', {
      orderId,
      error: (error as Error).message,
    });
  }
}

/**
 * Traiter un payout complété (transfert vers fournisseur réussi)
 */
async function handlePayoutCompleted(data: WaveWebhookData): Promise<void> {
  const { client_reference: orderId, id: transferId } = data;

  logger.info('Payout completed', { orderId, transferId });
  // Le transfert a été fait, rien à faire de plus
}

/**
 * Traiter un payout échoué
 */
async function handlePayoutFailed(data: WaveWebhookData): Promise<void> {
  const { client_reference: orderId, failure_code, failure_description } = data;

  logger.error('Payout failed', {
    orderId,
    failureCode: failure_code,
    failureDescription: failure_description,
  });

  if (!orderId) return;

  try {
    // Récupérer les informations de l'escrow et du supplier
    const escrow = await prisma.escrowTransaction.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            supplier: true,
          },
        },
      },
    });

    if (escrow && escrow.order?.supplier) {
      // Émettre l'événement PAYOUT_FAILED pour notifier les admins
      eventService.emit(AppEvent.PAYOUT_FAILED, {
        orderId,
        escrowId: escrow.id,
        supplierId: escrow.supplierId,
        supplierUserId: escrow.order.supplier.userId,
        amount: escrow.supplierAmount,
        reason: `${failure_code}: ${failure_description}`,
      });
    }
  } catch (error) {
    logger.error('Failed to emit PAYOUT_FAILED event', {
      orderId,
      error: (error as Error).message,
    });
  }
}

/**
 * @route GET /api/v1/payments/wave/success
 * @desc Callback de succès Wave - Redirige le client après paiement réussi
 * @access Public
 */
export const handleWaveSuccess = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.query;

    if (!orderId) {
      throw new AppError(400, 'Order ID manquant');
    }

    // Vérifier le statut du checkout
    const escrow = await escrowService.getByOrderId(orderId as string);

    if (!escrow) {
      throw new AppError(404, 'Transaction non trouvée');
    }

    // Si le webhook n'a pas encore été traité, vérifier manuellement
    if (escrow.status === 'PENDING' && escrow.waveCheckoutId) {
      const checkout = await waveService.getCheckoutStatus(
        escrow.waveCheckoutId
      );

      if (
        checkout.checkout_status === 'complete' &&
        checkout.payment_status === 'succeeded' &&
        checkout.transaction_id
      ) {
        await escrowService.confirmPayment(
          orderId as string,
          checkout.transaction_id
        );
      }
    }

    // Rediriger vers l'app mobile ou la page de confirmation
    const redirectUrl = `${process.env.MOBILE_APP_SCHEME || 'yapasgachis'}://order/${orderId}?status=success`;

    logger.info('Wave payment success callback', { orderId });

    res.redirect(redirectUrl);
  }
);

/**
 * @route GET /api/v1/payments/wave/error
 * @desc Callback d'erreur Wave - Redirige le client après échec de paiement
 * @access Public
 */
export const handleWaveError = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.query;

    logger.info('Wave payment error callback', { orderId });

    // Rediriger vers l'app mobile ou la page d'erreur
    const redirectUrl = `${process.env.MOBILE_APP_SCHEME || 'yapasgachis'}://order/${orderId}?status=error`;

    res.redirect(redirectUrl);
  }
);

/**
 * @route GET /api/v1/payments/status/:orderId
 * @desc Vérifier le statut de paiement d'une commande
 * @access Private
 */
export const checkPaymentStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur a accès à cette commande
    const order = await orderService.getOrderById(orderId, userId);

    const escrow = await escrowService.getByOrderId(orderId);

    res.json({
      success: true,
      data: {
        orderId,
        orderStatus: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: escrow?.status || (order.paidAt ? 'PAID' : 'PENDING'),
        paidAt: order.paidAt || escrow?.paidAt,
        amount: order.total,
      },
    });
  }
);

/**
 * @route POST /api/v1/payments/retry/:orderId
 * @desc Réessayer un paiement Wave (génère une nouvelle URL de checkout)
 * @access Private
 */
export const retryPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur a accès et que la commande est en attente de paiement
    const order = await orderService.getOrderById(orderId, userId);

    if (order.status !== 'PENDING_PAYMENT') {
      throw new AppError(
        400,
        "Cette commande n'est pas en attente de paiement"
      );
    }

    if (order.paymentMethod !== 'WAVE') {
      throw new AppError(400, "Cette commande n'utilise pas Wave");
    }

    // Récupérer l'escrow existant
    const escrow = await escrowService.getByOrderId(orderId);

    if (!escrow) {
      throw new AppError(404, 'Transaction de paiement non trouvée');
    }

    // Créer un nouveau checkout
    const checkout = await waveService.createCheckout({
      amount: order.total,
      orderId,
      successUrl: `${process.env.APP_URL}/api/v1/payments/wave/success?orderId=${orderId}`,
      errorUrl: `${process.env.APP_URL}/api/v1/payments/wave/error?orderId=${orderId}`,
    });

    res.json({
      success: true,
      data: {
        paymentUrl: checkout.wave_launch_url,
        expiresAt: checkout.when_expires,
      },
    });
  }
);

export default {
  handleWaveWebhook,
  handleWaveSuccess,
  handleWaveError,
  checkPaymentStatus,
  retryPayment,
};
