import { Router } from 'express';

import paymentProviderController from '@/api/v1/controllers/payment-provider.controller';
import {
  createPaymentProviderSchema,
  updatePaymentProviderSchema,
  providerIdParamSchema,
  listPaymentProvidersSchema,
  updateDisplayOrderSchema,
} from '@/api/v1/validators/payment-provider.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

// ==================== ADMIN PAYMENT PROVIDER MANAGEMENT ====================

/**
 * Get all payment providers (admin - includes inactive)
 * GET /api/v1/admin/payment-providers
 */
router.get(
  '/',
  validate(listPaymentProvidersSchema),
  paymentProviderController.getAllProviders
);

/**
 * Create payment provider
 * POST /api/v1/admin/payment-providers
 */
router.post(
  '/',
  validate(createPaymentProviderSchema),
  paymentProviderController.createProvider
);

/**
 * Update display order
 * PATCH /api/v1/admin/payment-providers/display-order
 */
router.patch(
  '/display-order',
  validate(updateDisplayOrderSchema),
  paymentProviderController.updateDisplayOrder
);

/**
 * Get payment provider by ID
 * GET /api/v1/admin/payment-providers/:providerId
 */
router.get(
  '/:providerId',
  validate(providerIdParamSchema),
  paymentProviderController.getProviderById
);

/**
 * Update payment provider
 * PATCH /api/v1/admin/payment-providers/:providerId
 */
router.patch(
  '/:providerId',
  validate(updatePaymentProviderSchema),
  paymentProviderController.updateProvider
);

/**
 * Delete payment provider
 * DELETE /api/v1/admin/payment-providers/:providerId
 */
router.delete(
  '/:providerId',
  validate(providerIdParamSchema),
  paymentProviderController.deleteProvider
);

export default router;
