import { Router } from 'express';

import supplierWalletController from '@/api/v1/controllers/supplier-wallet.controller';
import { authenticate } from '@/middleware/auth.middleware';

const router: Router = Router();

/**
 * Supplier Wallet Routes
 * Base path: /api/v1/supplier/wallet
 * All routes require authentication
 */

/**
 * @route GET /api/v1/supplier/wallet
 * @desc Récupérer le solde du portefeuille
 */
router.get('/', authenticate, supplierWalletController.getWalletBalance);

/**
 * @route GET /api/v1/supplier/wallet/transactions
 * @desc Récupérer l'historique des transactions (revenus + retraits)
 */
router.get(
  '/transactions',
  authenticate,
  supplierWalletController.getWalletTransactions
);

/**
 * @route POST /api/v1/supplier/wallet/withdraw
 * @desc Demander un retrait de fonds
 */
router.post(
  '/withdraw',
  authenticate,
  supplierWalletController.requestWithdrawal
);

/**
 * @route GET /api/v1/supplier/wallet/withdrawals
 * @desc Récupérer l'historique des retraits
 */
router.get(
  '/withdrawals',
  authenticate,
  supplierWalletController.getWithdrawals
);

export default router;
