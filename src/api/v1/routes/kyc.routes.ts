/**
 * KYC Routes - Supplier
 * Phase 12: AI-based identity verification
 *
 * Routes for supplier KYC verification
 */

import { Router } from 'express';

import * as kycController from '@api/v1/controllers/kyc.controller';
import { validate } from '@middleware/validation.middleware';
import { authenticate } from '@middleware/auth.middleware';
import { requireRole } from '@middleware/role-guard.middleware';
import { uploadKycDocuments } from '@middleware/upload.middleware';
import { submitKycSchema, getKycStatusSchema } from '@api/v1/validators/kyc.validator';

const router = Router();

// All routes require authentication and supplier role
router.use(authenticate);
router.use(requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']));

/**
 * @route   POST /api/v1/kyc/submit
 * @desc    Submit KYC documents for verification
 * @access  Supplier only
 */
router.post(
  '/submit',
  uploadKycDocuments,
  validate(submitKycSchema),
  kycController.submitKyc
);

/**
 * @route   GET /api/v1/kyc/status
 * @desc    Get KYC verification status
 * @access  Supplier only
 */
router.get(
  '/status',
  validate(getKycStatusSchema),
  kycController.getKycStatus
);

export default router;
