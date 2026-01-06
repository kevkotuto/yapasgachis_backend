import { Router } from 'express';

import subscriptionController from '@/api/v1/controllers/subscription.controller';
import {
  createSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
  planIdParamSchema,
  createPromoCodeSchema,
  updatePromoCodeSchema,
  promoCodeIdParamSchema,
  searchPromoCodesSchema,
  createBulkPromoCodesSchema,
} from '@/api/v1/validators/subscription.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

// ==================== SUBSCRIPTION PLAN MANAGEMENT ====================

// Get all plans
router.get('/plans', subscriptionController.getAllPlans);

// Create plan
router.post(
  '/plans',
  validate(createSubscriptionPlanSchema),
  subscriptionController.createPlan
);

// Update plan
router.put(
  '/plans/:planId',
  validate(updateSubscriptionPlanSchema),
  subscriptionController.updatePlan
);

// Delete plan
router.delete(
  '/plans/:planId',
  validate(planIdParamSchema),
  subscriptionController.deletePlan
);

// ==================== PROMO CODE MANAGEMENT ====================

// Get all promo codes
router.get(
  '/promo-codes',
  validate(searchPromoCodesSchema),
  subscriptionController.getAllPromoCodes
);

// Create promo code
router.post(
  '/promo-codes',
  validate(createPromoCodeSchema),
  subscriptionController.createPromoCode
);

// Create bulk promo codes
router.post(
  '/promo-codes/bulk',
  validate(createBulkPromoCodesSchema),
  subscriptionController.createBulkPromoCodes
);

// Update promo code
router.put(
  '/promo-codes/:promoCodeId',
  validate(updatePromoCodeSchema),
  subscriptionController.updatePromoCode
);

// Disable promo code
router.post(
  '/promo-codes/:promoCodeId/disable',
  validate(promoCodeIdParamSchema),
  subscriptionController.disablePromoCode
);

// Delete promo code
router.delete(
  '/promo-codes/:promoCodeId',
  validate(promoCodeIdParamSchema),
  subscriptionController.deletePromoCode
);

export default router;
