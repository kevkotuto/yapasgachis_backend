import { Router } from 'express';

import stockMovementController from '../controllers/stock-movement.controller';
import {
  createStockMovementSchema,
  listStockMovementsSchema,
  getProductHistorySchema,
  getStoreMovementsSchema,
} from '../validators/stock-movement.validator';

import { authMiddleware } from '@/middleware/auth.middleware';
import { supplierOnly } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

/**
 * Stock Movement Routes
 * Base path: /api/v1/supplier/stock-movements
 *
 * All routes require authentication and SUPPLIER role
 */

/**
 * Create stock movement
 * POST /
 * Requires: Authentication + SUPPLIER role
 */
router.post(
  '/',
  authMiddleware,
  supplierOnly,
  validate(createStockMovementSchema),
  stockMovementController.createMovement
);

/**
 * List stock movements with filters
 * GET /
 * Requires: Authentication + SUPPLIER role
 */
router.get(
  '/',
  authMiddleware,
  supplierOnly,
  validate(listStockMovementsSchema),
  stockMovementController.listMovements
);

/**
 * Get product stock history
 * GET /products/:productId
 * Requires: Authentication + SUPPLIER role
 */
router.get(
  '/products/:productId',
  authMiddleware,
  supplierOnly,
  validate(getProductHistorySchema),
  stockMovementController.getProductHistory
);

/**
 * Get store stock movements
 * GET /stores/:storeId
 * Requires: Authentication + SUPPLIER role
 */
router.get(
  '/stores/:storeId',
  authMiddleware,
  supplierOnly,
  validate(getStoreMovementsSchema),
  stockMovementController.getStoreMovements
);

export default router;
