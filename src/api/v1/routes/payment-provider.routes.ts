import { Router } from 'express';

import paymentProviderController from '@/api/v1/controllers/payment-provider.controller';
import { providerSlugParamSchema } from '@/api/v1/validators/payment-provider.validator';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== PUBLIC ENDPOINTS ====================

/**
 * Get all active payment providers
 * GET /api/v1/payment-providers
 */
router.get('/', paymentProviderController.getActiveProviders);

/**
 * Get payment provider by slug
 * GET /api/v1/payment-providers/:slug
 */
router.get(
  '/:slug',
  validate(providerSlugParamSchema),
  paymentProviderController.getProviderBySlug
);

export default router;
