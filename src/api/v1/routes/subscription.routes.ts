import { Router } from 'express';
import subscriptionController from '@/api/v1/controllers/subscription.controller';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';
import {
  createSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
  planIdParamSchema,
  createPromoCodeSchema,
  updatePromoCodeSchema,
  promoCodeIdParamSchema,
  validatePromoCodeSchema,
  searchPromoCodesSchema,
  createBulkPromoCodesSchema,
  subscribeSchema,
  renewSubscriptionSchema,
} from '@/api/v1/validators/subscription.validator';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

// Get public subscription plans
router.get('/plans', subscriptionController.getPublicPlans);

// ==================== SUPPLIER ROUTES ====================

// Subscribe to a plan
router.post(
  '/subscribe',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(subscribeSchema),
  subscriptionController.subscribe
);

// Cancel subscription
router.post(
  '/cancel',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  subscriptionController.cancelSubscription
);

// Renew subscription
router.post(
  '/renew',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(renewSubscriptionSchema),
  subscriptionController.renewSubscription
);

// Get subscription limits
router.get(
  '/limits',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  subscriptionController.getSubscriptionLimits
);

// Validate promo code
router.post(
  '/promo-codes/validate',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(validatePromoCodeSchema),
  subscriptionController.validatePromoCode
);

// Get available promo codes for supplier
router.get(
  '/promo-codes/available',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  subscriptionController.getAvailablePromoCodes
);

export default router;
