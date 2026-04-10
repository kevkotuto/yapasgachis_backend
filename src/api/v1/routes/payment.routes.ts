import { Router } from 'express';

import paymentController from '@/api/v1/controllers/payment.controller';
import { authenticate } from '@/middleware/auth.middleware';

const router: Router = Router();

/**
 * Routes publiques (webhooks et callbacks)
 */

/**
 * @route POST /api/v1/payments/wave/webhook
 * @desc Webhook Wave - Notifie des événements de paiement
 * @access Public (vérifié par signature Wave)
 */
router.post('/wave/webhook', paymentController.handleWaveWebhook);

/**
 * @route GET /api/v1/payments/wave/callback/success
 * @desc Callback de succès Wave - Page HTML avec deep link vers l'app
 * @access Public
 */
router.get(
  '/wave/callback/success',
  paymentController.handleWaveCallbackSuccess
);

/**
 * @route GET /api/v1/payments/wave/callback/error
 * @desc Callback d'erreur Wave - Page HTML avec deep link vers l'app
 * @access Public
 */
router.get('/wave/callback/error', paymentController.handleWaveCallbackError);

/**
 * Routes authentifiées
 */

/**
 * @route GET /api/v1/payments/status/:orderId
 * @desc Vérifier le statut de paiement d'une commande
 * @access Private
 */
router.get(
  '/status/:orderId',
  authenticate,
  paymentController.checkPaymentStatus
);

/**
 * @route POST /api/v1/payments/retry/:orderId
 * @desc Réessayer un paiement (génère une nouvelle URL Wave)
 * @access Private
 */
router.post('/retry/:orderId', authenticate, paymentController.retryPayment);

/**
 * @route POST /api/v1/payments/refund/:orderId
 * @desc Demander un remboursement client (72h max, commande non traitée)
 * @access Private
 */
router.post(
  '/refund/:orderId',
  authenticate,
  paymentController.requestClientRefund
);

/**
 * @route POST /api/v1/payments/supplier-refund/:orderId
 * @desc Remboursement initié par le vendeur
 * @access Private (Supplier)
 */
router.post(
  '/supplier-refund/:orderId',
  authenticate,
  paymentController.requestSupplierRefund
);

export default router;
