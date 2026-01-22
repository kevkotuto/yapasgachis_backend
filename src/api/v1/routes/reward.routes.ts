import { Router } from 'express';

import rewardController from '@/api/v1/controllers/reward.controller';
import {
  redeemPointsSchema,
  transactionHistorySchema,
  tierParamSchema,
  calculateDiscountSchema,
  adminAwardPointsSchema,
  adminUserIdSchema,
} from '@/api/v1/validators/reward.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

// Get all tiers information
router.get('/tiers', rewardController.getAllTiers);

// Get specific tier benefits
router.get(
  '/tiers/:tier',
  validate(tierParamSchema),
  rewardController.getTierBenefits
);

// ==================== AUTHENTICATED ROUTES ====================

// Get my rewards summary
router.get('/me', authenticate, rewardController.getMyRewards);

// Get transaction history
router.get(
  '/transactions',
  authenticate,
  validate(transactionHistorySchema),
  rewardController.getTransactions
);

// Redeem points
router.post(
  '/redeem',
  authenticate,
  validate(redeemPointsSchema),
  rewardController.redeemPoints
);

// Claim daily login points
router.post('/daily-login', authenticate, rewardController.claimDailyPoints);

// Calculate discount from points
router.post(
  '/calculate-discount',
  authenticate,
  validate(calculateDiscountSchema),
  rewardController.calculateDiscount
);

// ==================== ADMIN ROUTES ====================

// Award points to user
router.post(
  '/admin/award',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validate(adminAwardPointsSchema),
  rewardController.adminAwardPoints
);

// Get user rewards
router.get(
  '/admin/:userId',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validate(adminUserIdSchema),
  rewardController.adminGetUserRewards
);

export default router;
