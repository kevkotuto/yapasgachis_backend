import { Router } from 'express';
import dealController from '@/api/v1/controllers/deal.controller';
import { authenticate, optionalAuthenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';
import {
  createDealSchema,
  updateDealSchema,
  dealIdParamSchema,
  searchDealsSchema,
  bookDealSchema,
  bookingIdParamSchema,
  cancelBookingSchema,
  validateBookingSchema,
  userBookingsQuerySchema,
  supplierBookingsQuerySchema,
  supplierDealsQuerySchema,
} from '@/api/v1/validators/deal.validator';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

// Search deals
router.get(
  '/',
  validate(searchDealsSchema),
  dealController.searchDeals
);

// Get deal by ID
router.get(
  '/:dealId',
  validate(dealIdParamSchema),
  dealController.getDealById
);

// ==================== USER ROUTES ====================

// Book a deal
router.post(
  '/:dealId/book',
  authenticate,
  validate(bookDealSchema),
  dealController.bookDeal
);

// Get user's bookings
router.get(
  '/bookings/my-bookings',
  authenticate,
  validate(userBookingsQuerySchema),
  dealController.getUserBookings
);

// Cancel booking
router.post(
  '/bookings/:bookingId/cancel',
  authenticate,
  validate(cancelBookingSchema),
  dealController.cancelBooking
);

// Get booking QR code
router.get(
  '/bookings/:bookingId/qr-code',
  authenticate,
  validate(bookingIdParamSchema),
  dealController.getBookingQRCode
);

export default router;
