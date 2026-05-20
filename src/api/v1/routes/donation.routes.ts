import { Router } from 'express';

import donationController from '@/api/v1/controllers/donation.controller';
import {
  createFoodDonationSchema,
  createFinancialDonationSchema,
  createInKindDonationSchema,
  donationIdParamSchema,
  updateDonationStatusSchema,
  schedulePickupSchema,
  cancelDonationSchema,
  getDonationsQuerySchema,
} from '@/api/v1/validators/donation.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== DONOR ROUTES ====================

// Create a food donation (supplier can donate their products)
router.post(
  '/food',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(createFoodDonationSchema),
  donationController.createFoodDonation
);

// Create a financial donation (any authenticated user)
router.post(
  '/financial',
  authenticate,
  validate(createFinancialDonationSchema),
  donationController.createFinancialDonation
);

// Create an in-kind donation (any authenticated user)
router.post(
  '/in-kind',
  authenticate,
  validate(createInKindDonationSchema),
  donationController.createInKindDonation
);

// Get my donations (as donor)
router.get(
  '/my-donations',
  authenticate,
  validate(getDonationsQuerySchema),
  donationController.getMyDonations
);

// Get my donor statistics
router.get('/my-stats', authenticate, donationController.getMyStats);

// Get comprehensive donation stats (association)
router.get(
  '/stats',
  authenticate,
  requireRole(['ASSOCIATION']),
  donationController.getStats
);

// Get donation by ID
router.get(
  '/:donationId',
  authenticate,
  validate(donationIdParamSchema),
  donationController.getById
);

// Cancel donation
router.post(
  '/:donationId/cancel',
  authenticate,
  validate(cancelDonationSchema),
  donationController.cancel
);

// Generate receipt
router.post(
  '/:donationId/receipt',
  authenticate,
  validate(donationIdParamSchema),
  donationController.generateReceipt
);

// Generate certificate
router.post(
  '/:donationId/certificate',
  authenticate,
  validate(donationIdParamSchema),
  donationController.generateCertificate
);

// ==================== ASSOCIATION ROUTES ====================

// Schedule pickup for food donation (association only)
router.post(
  '/:donationId/schedule-pickup',
  authenticate,
  requireRole(['ASSOCIATION']),
  validate(schedulePickupSchema),
  donationController.schedulePickup
);

// Confirm pickup (association only)
router.post(
  '/:donationId/confirm-pickup',
  authenticate,
  requireRole(['ASSOCIATION']),
  validate(donationIdParamSchema),
  donationController.confirmPickup
);

// Update donation status (association or donor)
router.patch(
  '/:donationId/status',
  authenticate,
  validate(updateDonationStatusSchema),
  donationController.updateStatus
);

export default router;
