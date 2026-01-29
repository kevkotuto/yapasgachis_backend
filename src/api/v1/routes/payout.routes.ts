import { Router } from 'express';

import payoutController from '@/api/v1/controllers/payout.controller';
import {
  configurePayoutMethodSchema,
  storePayoutMethodSchema,
  storeIdParamSchema,
} from '@/api/v1/validators/payout.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// All routes require supplier authentication
router.use(authenticate);
router.use(requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']));

// ==================== SUPPLIER PAYOUT CONFIGURATION ====================

/**
 * Get supplier payout method
 * GET /api/v1/supplier/payout
 */
router.get('/', payoutController.getSupplierPayoutMethod);

/**
 * Configure supplier payout method
 * PUT /api/v1/supplier/payout
 */
router.put(
  '/',
  validate(configurePayoutMethodSchema),
  payoutController.configureSupplierPayoutMethod
);

/**
 * Remove supplier payout method
 * DELETE /api/v1/supplier/payout
 */
router.delete('/', payoutController.removeSupplierPayoutMethod);

// ==================== STORE PAYOUT CONFIGURATION ====================

/**
 * Get store payout method
 * GET /api/v1/supplier/stores/:storeId/payout
 */
router.get(
  '/stores/:storeId',
  validate(storeIdParamSchema),
  payoutController.getStorePayoutMethod
);

/**
 * Configure store payout method
 * PUT /api/v1/supplier/stores/:storeId/payout
 */
router.put(
  '/stores/:storeId',
  validate(storePayoutMethodSchema),
  payoutController.configureStorePayoutMethod
);

/**
 * Remove store payout method
 * DELETE /api/v1/supplier/stores/:storeId/payout
 */
router.delete(
  '/stores/:storeId',
  validate(storeIdParamSchema),
  payoutController.removeStorePayoutMethod
);

export default router;
