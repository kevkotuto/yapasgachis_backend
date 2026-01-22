/**
 * Admin KYC Routes
 * Phase 12: AI-based identity verification
 *
 * Routes for admin KYC management
 */

import { Router } from 'express';

import * as kycController from '@api/v1/controllers/kyc.controller';
import { validate } from '@middleware/validation.middleware';
import { authenticate } from '@middleware/auth.middleware';
import { requireRole } from '@middleware/role-guard.middleware';
import {
  getPendingReviewsSchema,
  getAttemptsSchema,
  getAttemptDetailsSchema,
  adminReviewKycSchema,
  forceVerifySchema,
  requestResubmissionSchema,
} from '@api/v1/validators/kyc.validator';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

/**
 * @route   GET /api/v1/admin/kyc/stats
 * @desc    Get KYC verification statistics
 * @access  Admin only
 */
router.get('/stats', kycController.getStats);

/**
 * @route   GET /api/v1/admin/kyc/pending
 * @desc    Get pending KYC reviews
 * @access  Admin only
 */
router.get(
  '/pending',
  validate(getPendingReviewsSchema),
  kycController.getPendingReviews
);

/**
 * @route   GET /api/v1/admin/kyc/attempts
 * @desc    Get all KYC attempts with filters
 * @access  Admin only
 */
router.get('/attempts', validate(getAttemptsSchema), kycController.getAttempts);

/**
 * @route   GET /api/v1/admin/kyc/attempts/:attemptId
 * @desc    Get KYC attempt details
 * @access  Admin only
 */
router.get(
  '/attempts/:attemptId',
  validate(getAttemptDetailsSchema),
  kycController.getAttemptDetails
);

/**
 * @route   POST /api/v1/admin/kyc/attempts/:attemptId/review
 * @desc    Review and approve/reject a KYC attempt
 * @access  Admin only
 */
router.post(
  '/attempts/:attemptId/review',
  validate(adminReviewKycSchema),
  kycController.reviewAttempt
);

/**
 * @route   POST /api/v1/admin/kyc/suppliers/:supplierId/force-verify
 * @desc    Force verify a supplier (bypass AI verification)
 * @access  Admin only
 */
router.post(
  '/suppliers/:supplierId/force-verify',
  validate(forceVerifySchema),
  kycController.forceVerify
);

/**
 * @route   POST /api/v1/admin/kyc/suppliers/:supplierId/request-resubmission
 * @desc    Request document resubmission from supplier
 * @access  Admin only
 */
router.post(
  '/suppliers/:supplierId/request-resubmission',
  validate(requestResubmissionSchema),
  kycController.requestResubmission
);

export default router;
