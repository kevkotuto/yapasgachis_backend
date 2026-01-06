import { Router } from 'express';

import dealController from '@/api/v1/controllers/deal.controller';
import {
  createDealSchema,
  updateDealSchema,
  dealIdParamSchema,
  validateBookingSchema,
  supplierBookingsQuerySchema,
  supplierDealsQuerySchema,
} from '@/api/v1/validators/deal.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// All routes require supplier authentication
router.use(authenticate);
router.use(requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']));

// ==================== DEAL MANAGEMENT ====================

// Get supplier's deals
router.get(
  '/',
  validate(supplierDealsQuerySchema),
  dealController.getSupplierDeals
);

// Create a deal
router.post('/', validate(createDealSchema), dealController.createDeal);

// Update a deal
router.put('/:dealId', validate(updateDealSchema), dealController.updateDeal);

// Toggle deal pause
router.post(
  '/:dealId/toggle-pause',
  validate(dealIdParamSchema),
  dealController.toggleDealPause
);

// Delete a deal
router.delete(
  '/:dealId',
  validate(dealIdParamSchema),
  dealController.deleteDeal
);

// ==================== BOOKING MANAGEMENT ====================

// Get supplier's bookings
router.get(
  '/bookings',
  validate(supplierBookingsQuerySchema),
  dealController.getSupplierBookings
);

// Validate a booking
router.post(
  '/bookings/validate',
  validate(validateBookingSchema),
  dealController.validateBooking
);

export default router;
