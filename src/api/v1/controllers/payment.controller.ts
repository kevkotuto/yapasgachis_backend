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
 * @route GET /api/v1/payments/wave/callback/success
 * @desc Callback de succès Wave - Sert une page HTML qui redirige vers l'app via deep link
 * @access Public
 */
export const handleWaveCallbackSuccess = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.query;

    if (!orderId) {
      throw new AppError(400, 'Order ID manquant');
    }

    logger.info('Wave payment success callback', { orderId });

    // Vérifier le statut du checkout et confirmer si nécessaire
    const escrow = await escrowService.getByOrderId(orderId as string);

    if (escrow && escrow.status === 'PENDING' && escrow.waveCheckoutId) {
      try {
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
      } catch (error) {
        logger.error('Failed to verify payment in callback', {
          orderId,
          error: (error as Error).message,
        });
      }
    }

    const deepLink = `yapasgachis://payment-result?orderId=${orderId}&status=success`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paiement réussi - YaPasGachis</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 40px 32px;
      text-align: center;
      max-width: 400px;
      width: 100%;
    }
    .icon {
      width: 80px; height: 80px;
      background: #F0FDF4;
      border: 4px solid #DCFCE7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 36px;
    }
    h1 { color: #166534; font-size: 22px; margin-bottom: 12px; }
    p { color: #6B7280; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      background: #22C55E;
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      width: 100%;
    }
    .spinner {
      width: 24px; height: 24px;
      border: 3px solid #E5E7EB;
      border-top: 3px solid #22C55E;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .redirect-text { color: #9CA3AF; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Paiement réussi !</h1>
    <p>Votre paiement a été confirmé avec succès. Vous allez être redirigé vers l'application.</p>
    <div class="spinner" id="spinner"></div>
    <p class="redirect-text" id="redirect-text">Redirection en cours...</p>
    <a href="${deepLink}" class="btn" id="open-btn" style="display:none;">Ouvrir l'application</a>
  </div>
  <script>
    // Tenter le deep link automatiquement
    setTimeout(function() {
      window.location.href = '${deepLink}';
      // Si le deep link ne marche pas après 2s, afficher le bouton
      setTimeout(function() {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('redirect-text').style.display = 'none';
        document.getElementById('open-btn').style.display = 'inline-block';
      }, 2000);
    }, 500);
  </script>
</body>
</html>`);
  }
);

/**
 * @route GET /api/v1/payments/wave/callback/error
 * @desc Callback d'erreur Wave - Sert une page HTML qui redirige vers l'app
 * @access Public
 */
export const handleWaveCallbackError = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.query;

    logger.info('Wave payment error callback', { orderId });

    const deepLink = `yapasgachis://payment-result?orderId=${orderId || ''}&status=error`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erreur de paiement - YaPasGachis</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 40px 32px;
      text-align: center;
      max-width: 400px;
      width: 100%;
    }
    .icon {
      width: 80px; height: 80px;
      background: #FEF2F2;
      border: 4px solid #FEE2E2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 36px;
    }
    h1 { color: #991B1B; font-size: 22px; margin-bottom: 12px; }
    p { color: #6B7280; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      background: #EF4444;
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      width: 100%;
    }
    .spinner {
      width: 24px; height: 24px;
      border: 3px solid #E5E7EB;
      border-top: 3px solid #EF4444;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .redirect-text { color: #9CA3AF; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>Erreur de paiement</h1>
    <p>Le paiement n'a pas pu être effectué. Vous pouvez réessayer depuis l'application.</p>
    <div class="spinner" id="spinner"></div>
    <p class="redirect-text" id="redirect-text">Redirection en cours...</p>
    <a href="${deepLink}" class="btn" id="open-btn" style="display:none;">Retourner à l'application</a>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = '${deepLink}';
      setTimeout(function() {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('redirect-text').style.display = 'none';
        document.getElementById('open-btn').style.display = 'inline-block';
      }, 2000);
    }, 500);
  </script>
</body>
</html>`);
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

/**
 * @route POST /api/v1/payments/refund/:orderId
 * @desc Demander un remboursement client (dans les 72h, si commande pas encore traitée)
 * @access Private
 */
export const requestClientRefund = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      throw new AppError(
        400,
        'Veuillez fournir une raison valide (minimum 5 caractères)'
      );
    }

    const result = await escrowService.clientRefund(
      orderId,
      userId,
      reason.trim()
    );

    res.json({
      success: true,
      message: 'Remboursement effectué avec succès',
      data: {
        orderId,
        status: result.status,
        amount: result.amount,
        refundedAt: result.refundedAt,
      },
    });
  }
);

/**
 * @route POST /api/v1/payments/supplier-refund/:orderId
 * @desc Remboursement initié par le vendeur
 * @access Private (Supplier only)
 */
export const requestSupplierRefund = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      throw new AppError(
        400,
        'Veuillez fournir une raison valide (minimum 5 caractères)'
      );
    }

    // Récupérer le profil fournisseur
    const supplier = await prisma.supplierProfile.findUnique({
      where: { userId },
    });

    if (!supplier) {
      throw new AppError(403, 'Profil fournisseur non trouvé');
    }

    const result = await escrowService.supplierRefund(
      orderId,
      supplier.id,
      reason.trim()
    );

    res.json({
      success: true,
      message: 'Remboursement effectué avec succès',
      data: {
        orderId,
        status: result.status,
        amount: result.amount,
        refundedAt: result.refundedAt,
      },
    });
  }
);

export default {
  handleWaveWebhook,
  handleWaveCallbackSuccess,
  handleWaveCallbackError,
  checkPaymentStatus,
  retryPayment,
  requestClientRefund,
  requestSupplierRefund,
};
