import { Router } from 'express';

import supplierController from '../controllers/supplier.controller';
import {
  createSupplierProfileSchema,
  updateSupplierProfileSchema,
  searchSuppliersSchema,
  getSupplierByIdSchema,
  updateSubscriptionSchema,
  getNearbySuppliersSchema,
} from '../validators/supplier.validator';

import { authMiddleware } from '@/middleware/auth.middleware';
import { supplierOnly } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

/**
 * Supplier Routes
 * Base path: /api/v1/suppliers
 */

// ==================== PUBLIC ROUTES ====================

/**
 * Search suppliers (public)
 * GET /search
 */
router.get(
  '/search',
  validate(searchSuppliersSchema),
  supplierController.searchSuppliers
);

/**
 * Get nearby suppliers (public)
 * GET /nearby
 */
router.get(
  '/nearby',
  validate(getNearbySuppliersSchema),
  supplierController.getNearbySuppliers
);

// ==================== PROTECTED ROUTES ====================

/**
 * Create supplier profile
 * POST /profile
 * Requires: Authentication + SUPPLIER role
 */
router.post(
  '/profile',
  authMiddleware,
  supplierOnly,
  validate(createSupplierProfileSchema),
  supplierController.createProfile
);

/**
 * Get current supplier's profile
 * GET /profile
 * Requires: Authentication + SUPPLIER role
 */
router.get(
  '/profile',
  authMiddleware,
  supplierOnly,
  supplierController.getMyProfile
);

/**
 * Update supplier profile
 * PUT /profile
 * Requires: Authentication + SUPPLIER role
 */
router.put(
  '/profile',
  authMiddleware,
  supplierOnly,
  validate(updateSupplierProfileSchema),
  supplierController.updateProfile
);

/**
 * Delete supplier profile
 * DELETE /profile
 * Requires: Authentication + SUPPLIER role
 */
router.delete(
  '/profile',
  authMiddleware,
  supplierOnly,
  supplierController.deleteProfile
);

/**
 * Get supplier statistics
 * GET /statistics
 * Requires: Authentication + SUPPLIER role
 */
router.get(
  '/statistics',
  authMiddleware,
  supplierOnly,
  supplierController.getStatistics
);

/**
 * Update subscription
 * POST /subscription
 * Requires: Authentication + SUPPLIER role
 */
router.post(
  '/subscription',
  authMiddleware,
  supplierOnly,
  validate(updateSubscriptionSchema),
  supplierController.updateSubscription
);

/**
 * Check if can create products
 * GET /can-create-products
 * Requires: Authentication + SUPPLIER role
 */
router.get(
  '/can-create-products',
  authMiddleware,
  supplierOnly,
  supplierController.canCreateProducts
);

// ==================== PARAMETERIZED ROUTES (MUST BE LAST) ====================

/**
 * Get supplier by ID (public)
 * GET /:id
 */
router.get(
  '/:id',
  validate(getSupplierByIdSchema),
  supplierController.getProfileById
);

export default router;
