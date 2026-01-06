import { Router } from 'express';

import donationController from '@/api/v1/controllers/donation.controller';
import { getDonationsQuerySchema } from '@/api/v1/validators/donation.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

/**
 * Association Donation Routes
 * Routes for associations to manage their received donations
 * Base path: /api/v1/associations/donations
 */

// Get donations received by association
router.get(
  '/',
  authenticate,
  requireRole(['ASSOCIATION']),
  validate(getDonationsQuerySchema),
  donationController.getAssociationDonations
);

// Get pending pickups for association
router.get(
  '/pending-pickups',
  authenticate,
  requireRole(['ASSOCIATION']),
  donationController.getPendingPickups
);

// Get association donation statistics
router.get(
  '/stats',
  authenticate,
  requireRole(['ASSOCIATION']),
  donationController.getAssociationStats
);

export default router;
