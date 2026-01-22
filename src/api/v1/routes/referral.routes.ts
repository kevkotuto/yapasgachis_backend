import { Router } from 'express';

import referralController from '@/api/v1/controllers/referral.controller';
import {
  createReferralCodeSchema,
  useReferralCodeSchema,
  validateCodeSchema,
  referralHistorySchema,
  updateReferralCodeSchema,
  codeIdParamSchema,
  userIdParamSchema,
} from '@/api/v1/validators/referral.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

// Validate a referral code
router.get(
  '/validate/:code',
  validate(validateCodeSchema),
  referralController.validateCode
);

// ==================== AUTHENTICATED ROUTES ====================

// Create referral code
router.post(
  '/code',
  authenticate,
  validate(createReferralCodeSchema),
  referralController.createCode
);

// Get my referral codes
router.get('/my-codes', authenticate, referralController.getMyCodes);

// Use a referral code
router.post(
  '/use',
  authenticate,
  validate(useReferralCodeSchema),
  referralController.useCode
);

// Get referral stats
router.get('/stats', authenticate, referralController.getStats);

// Get referral history
router.get(
  '/history',
  authenticate,
  validate(referralHistorySchema),
  referralController.getHistory
);

// Update referral code
router.patch(
  '/code/:codeId',
  authenticate,
  validate(updateReferralCodeSchema),
  referralController.updateCode
);

// Delete referral code
router.delete(
  '/code/:codeId',
  authenticate,
  validate(codeIdParamSchema),
  referralController.deleteCode
);

// ==================== INTERNAL ROUTES (System use) ====================

// Complete referral (called after first purchase)
router.post(
  '/complete/:userId',
  authenticate,
  validate(userIdParamSchema),
  referralController.completeReferral
);

// Award referral reward
router.post(
  '/award/:userId',
  authenticate,
  validate(userIdParamSchema),
  referralController.awardReward
);

export default router;
