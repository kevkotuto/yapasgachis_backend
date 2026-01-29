import { Router } from 'express';

import userController from '@/api/v1/controllers/user.controller';
import {
  updateProfileSchema,
  updateAvatarSchema,
  checkContactsSchema,
  addPaymentMethodSchema,
  updatePaymentMethodSchema,
  deletePaymentMethodSchema,
  setDefaultPaymentMethodSchema,
  deleteAccountSchema,
} from '@/api/v1/validators/user.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

/**
 * User Routes
 * Base path: /api/v1/users
 */

// ==================== PROFILE MANAGEMENT ====================

/**
 * Update user profile (name, email, phone, location, language)
 * PUT /profile
 */
router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  userController.updateProfile
);

/**
 * Update user avatar/photo
 * PUT /avatar
 */
router.put(
  '/avatar',
  authenticate,
  validate(updateAvatarSchema),
  userController.updateAvatar
);

/**
 * Get user's referral code
 * GET /referral-code
 */
router.get('/referral-code', authenticate, userController.getReferralCode);

/**
 * Delete user account (requires password confirmation)
 * DELETE /account
 *
 * Body: { password: string }
 *
 * Verifies password, deletes all user data, invalidates all tokens
 */
router.delete(
  '/account',
  authenticate,
  validate(deleteAccountSchema),
  userController.deleteAccount
);

// ==================== CONTACTS ====================

/**
 * Check which contacts are on YapaGachis (bulk)
 * POST /contacts/check
 *
 * Body: { phoneNumbers: ["+2250701234567", "+2250709876543", ...] }
 *
 * Returns which phone numbers are registered on the platform
 */
router.post(
  '/contacts/check',
  authenticate,
  validate(checkContactsSchema),
  userController.checkContacts
);

// ==================== PAYMENT METHODS ====================

/**
 * Get user's payment methods
 * GET /payment-methods
 */
router.get('/payment-methods', authenticate, userController.getPaymentMethods);

/**
 * Add a new payment method
 * POST /payment-methods
 *
 * Body: {
 *   provider: "WAVE" | "ORANGE_MONEY" | "MTN_MONEY" | "MOOV_MONEY",
 *   phoneNumber: "+2250701234567",
 *   accountName: "Jean Dupont",
 *   isDefault: false
 * }
 */
router.post(
  '/payment-methods',
  authenticate,
  validate(addPaymentMethodSchema),
  userController.addPaymentMethod
);

/**
 * Update a payment method
 * PUT /payment-methods/:methodId
 */
router.put(
  '/payment-methods/:methodId',
  authenticate,
  validate(updatePaymentMethodSchema),
  userController.updatePaymentMethod
);

/**
 * Delete a payment method
 * DELETE /payment-methods/:methodId
 */
router.delete(
  '/payment-methods/:methodId',
  authenticate,
  validate(deletePaymentMethodSchema),
  userController.deletePaymentMethod
);

/**
 * Set default payment method
 * POST /payment-methods/:methodId/default
 */
router.post(
  '/payment-methods/:methodId/default',
  authenticate,
  validate(setDefaultPaymentMethodSchema),
  userController.setDefaultPaymentMethod
);

export default router;
