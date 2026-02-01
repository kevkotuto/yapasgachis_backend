import { Router } from 'express';

import dealController from '@/api/v1/controllers/deal.controller';
import { dealRoomController } from '@/api/v1/controllers/deal-room.controller';
import {
  createDealSchema,
  updateDealSchema,
  dealIdParamSchema,
  searchDealsSchema,
  bookDealSchema,
  purchaseDealSchema,
  bookingIdParamSchema,
  cancelBookingSchema,
  validateBookingSchema,
  userBookingsQuerySchema,
  supplierBookingsQuerySchema,
  supplierDealsQuerySchema,
} from '@/api/v1/validators/deal.validator';
import {
  createDealRoomSchema,
  updateDealRoomSchema,
  getRoomsByDealIdSchema,
  getRoomByIdSchema,
  deleteRoomSchema,
} from '@/api/v1/validators/deal-room.validator';
import {
  authenticate,
  optionalAuthenticate,
} from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

// Search deals
router.get('/', validate(searchDealsSchema), dealController.searchDeals);

// Get deal by ID
router.get('/:dealId', validate(dealIdParamSchema), dealController.getDealById);

// ==================== DEAL ROOMS ROUTES ====================

// Get rooms for a deal (public)
router.get(
  '/:dealId/rooms',
  validate(getRoomsByDealIdSchema),
  dealRoomController.getRoomsByDealId
);

// Get specific room (public)
router.get(
  '/:dealId/rooms/:roomId',
  validate(getRoomByIdSchema),
  dealRoomController.getRoomById
);

// Create room (supplier only - both FOOD and DEALS)
router.post(
  '/:dealId/rooms',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(createDealRoomSchema),
  dealRoomController.createRoom
);

// Update room (supplier only - both FOOD and DEALS)
router.put(
  '/:dealId/rooms/:roomId',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(updateDealRoomSchema),
  dealRoomController.updateRoom
);

// Delete room (supplier only - both FOOD and DEALS)
router.delete(
  '/:dealId/rooms/:roomId',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(deleteRoomSchema),
  dealRoomController.deleteRoom
);

// ==================== USER ROUTES ====================

// Book a deal
router.post(
  '/:dealId/book',
  authenticate,
  validate(bookDealSchema),
  dealController.bookDeal
);

// Purchase a deal (no booking required)
router.post(
  '/:dealId/purchase',
  authenticate,
  validate(purchaseDealSchema),
  dealController.purchaseDeal
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
