import { Router } from 'express';
import adminPaymentController from '@/api/v1/controllers/admin-payment.controller';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRoles } from '@/middleware/role-guard.middleware';

const router: Router = Router();

// Toutes les routes nécessitent une authentification admin
router.use(authenticate);
router.use(requireRoles(['ADMIN', 'SUPER_ADMIN']));

/**
 * @route GET /api/v1/admin/payments/statistics
 * @desc Statistiques des paiements
 */
router.get('/statistics', adminPaymentController.getPaymentStatistics);

/**
 * @route GET /api/v1/admin/payments/escrow
 * @desc Liste des transactions escrow
 * @query status - Filtrer par statut (PENDING, FUNDS_HELD, RELEASED, REFUNDED, DISPUTED)
 * @query supplierId - Filtrer par fournisseur
 * @query startDate - Date de début
 * @query endDate - Date de fin
 * @query page - Page (défaut: 1)
 * @query limit - Limite (défaut: 20)
 */
router.get('/escrow', adminPaymentController.getEscrowTransactions);

/**
 * @route GET /api/v1/admin/payments/escrow/:orderId
 * @desc Détails d'une transaction escrow
 */
router.get('/escrow/:orderId', adminPaymentController.getEscrowByOrderId);

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/release
 * @desc Libérer les fonds vers le fournisseur
 * @body supplierPhoneNumber - Numéro de téléphone Wave du fournisseur
 */
router.post('/escrow/:orderId/release', adminPaymentController.releaseEscrow);

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/refund
 * @desc Rembourser le client
 * @body reason - Raison du remboursement
 * @body amount - Montant (optionnel, remboursement partiel)
 */
router.post('/escrow/:orderId/refund', adminPaymentController.refundEscrow);

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/dispute/open
 * @desc Ouvrir un litige
 * @body reason - Raison du litige
 */
router.post('/escrow/:orderId/dispute/open', adminPaymentController.openDispute);

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/dispute/resolve-supplier
 * @desc Résoudre un litige en faveur du fournisseur
 * @body resolution - Description de la résolution
 * @body supplierPhoneNumber - Numéro Wave du fournisseur
 */
router.post(
  '/escrow/:orderId/dispute/resolve-supplier',
  adminPaymentController.resolveDisputeForSupplier
);

/**
 * @route POST /api/v1/admin/payments/escrow/:orderId/dispute/resolve-client
 * @desc Résoudre un litige en faveur du client (remboursement)
 * @body resolution - Description de la résolution
 */
router.post(
  '/escrow/:orderId/dispute/resolve-client',
  adminPaymentController.resolveDisputeForClient
);

export default router;
