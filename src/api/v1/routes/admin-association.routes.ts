import { Router } from 'express';

import associationController from '@/api/v1/controllers/association.controller';
import {
  adminVerifyAssociationSchema,
  adminRejectAssociationSchema,
  adminSearchAssociationsSchema,
} from '@/api/v1/validators/association.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

/**
 * Admin Association Routes
 * Routes for admin to manage associations
 * Base path: /api/v1/admin/associations
 */

// Get all associations
router.get(
  '/',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validate(adminSearchAssociationsSchema),
  associationController.adminGetAll
);

// Get pending verification associations
router.get(
  '/pending',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  associationController.adminGetPending
);

// Get global association stats
router.get(
  '/stats',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  associationController.adminGetStats
);

// Verify an association
router.post(
  '/:associationId/verify',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validate(adminVerifyAssociationSchema),
  associationController.adminVerify
);

// Reject association verification
router.post(
  '/:associationId/reject',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validate(adminRejectAssociationSchema),
  associationController.adminReject
);

export default router;
