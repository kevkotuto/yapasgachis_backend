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
 * @route GET /api/v1/payments/wave/success
 * @desc Callback de succès - Redirige après paiement réussi
 * @access Public
 */
router.get('/wave/success', paymentController.handleWaveSuccess);

/**
 * @route GET /api/v1/payments/wave/error
 * @desc Callback d'erreur - Redirige après échec de paiement
 * @access Public
 */
router.get('/wave/error', paymentController.handleWaveError);

/**
 * Routes authentifiées
 */

/**
 * @route GET /api/v1/payments/status/:orderId
 * @desc Vérifier le statut de paiement d'une commande
 * @access Private
 */
router.get('/status/:orderId', authenticate, paymentController.checkPaymentStatus);

/**
 * @route POST /api/v1/payments/retry/:orderId
 * @desc Réessayer un paiement (génère une nouvelle URL Wave)
 * @access Private
 */
router.post('/retry/:orderId', authenticate, paymentController.retryPayment);

export default router;
