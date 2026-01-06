import { Router } from 'express';
import donationController from '@/api/v1/controllers/donation.controller';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';
import { searchDonationsSchema } from '@/api/v1/validators/donation.validator';

const router: Router = Router();

/**
 * Admin Donation Routes
 * Routes for admin to manage all donations
 * Base path: /api/v1/admin/donations
 */

// Search all donations
router.get(
  '/',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  validate(searchDonationsSchema),
  donationController.adminSearch
);

// Get global donation statistics
router.get(
  '/stats',
  authenticate,
  requireRole(['ADMIN', 'SUPER_ADMIN']),
  donationController.adminGetStats
);

export default router;
