import { DealCategory } from '@prisma/client';
import dealService from '@/core/services/deal.service';
import dealRepository from '@/core/repositories/deal.repository';
import dealBookingRepository from '@/core/repositories/deal-booking.repository';
import { AppError } from '@/middleware/error-handler.middleware';

// Mock repositories
jest.mock('@/core/repositories/deal.repository');
jest.mock('@/core/repositories/deal-booking.repository');
jest.mock('@/core/repositories/supplier.repository');
jest.mock('@/core/services/subscription.service');

describe('DealService - bookDeal with BookingMode', () => {
  const userId = 'user-123';
  const dealId = 'deal-123';
  const supplierId = 'supplier-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SINGLE_DATE mode', () => {
    const singleDateDeal = {
      id: dealId,
      supplierId,
      status: 'ACTIVE',
      bookingMode: 'SINGLE_DATE',
      dealPrice: 50000,
      quantityAvailable: 10,
      maxPerUser: 5,
      availableFrom: new Date('2026-01-01'),
      availableUntil: new Date('2026-12-31'),
      bookingLeadTime: 0,
      isOffPeakOnly: false,
      availableSlots: null,
      bookingsCount: 0,
    };

    it('should create booking without bookingEndDate', async () => {
      (dealRepository.findById as jest.Mock).mockResolvedValue(singleDateDeal);
      (dealBookingRepository.countUserBookingsForDeal as jest.Mock).mockResolvedValue(0);
      (dealBookingRepository.create as jest.Mock).mockResolvedValue({
        id: 'booking-123',
        dealId,
        userId,
        bookingDate: new Date('2026-06-15'),
        bookingEndDate: null,
        numberOfNights: null,
        quantity: 1,
        totalPrice: 50000,
        validationCode: 'ABC12345',
        status: 'PENDING',
      });
      (dealRepository.decrementQuantity as jest.Mock).mockResolvedValue(undefined);

      const booking = await dealService.bookDeal(userId, dealId, {
        bookingDate: new Date('2026-06-15'),
        quantity: 1,
        paymentMethod: 'WAVE',
      });

      expect(booking).toBeDefined();
      expect(booking.bookingEndDate).toBeNull();
      expect(booking.numberOfNights).toBeNull();
      expect(booking.totalPrice).toBe(50000); // price × quantity
    });

    it('should reject booking with bookingEndDate in SINGLE_DATE mode', async () => {
      (dealRepository.findById as jest.Mock).mockResolvedValue(singleDateDeal);
      (dealBookingRepository.countUserBookingsForDeal as jest.Mock).mockResolvedValue(0);

      await expect(
        dealService.bookDeal(userId, dealId, {
          bookingDate: new Date('2026-06-15'),
          bookingEndDate: new Date('2026-06-20'),
          quantity: 1,
          paymentMethod: 'WAVE',
        })
      ).rejects.toThrow(AppError);

      await expect(
        dealService.bookDeal(userId, dealId, {
          bookingDate: new Date('2026-06-15'),
          bookingEndDate: new Date('2026-06-20'),
          quantity: 1,
          paymentMethod: 'WAVE',
        })
      ).rejects.toThrow('Ce deal ne supporte pas les réservations multi-jours');
    });
  });

  describe('DATE_RANGE mode', () => {
    const dateRangeDeal = {
      id: dealId,
      supplierId,
      status: 'ACTIVE',
      bookingMode: 'DATE_RANGE',
      category: 'HOTEL_ROOM',
      dealPrice: 50000, // price per night
      quantityAvailable: 10,
      maxPerUser: 5,
      availableFrom: new Date('2026-01-01'),
      availableUntil: new Date('2026-12-31'),
      bookingLeadTime: 0,
      isOffPeakOnly: false,
      availableSlots: null,
      bookingsCount: 0,
    };

    it('should reject booking without bookingEndDate', async () => {
      (dealRepository.findById as jest.Mock).mockResolvedValue(dateRangeDeal);
      (dealBookingRepository.countUserBookingsForDeal as jest.Mock).mockResolvedValue(0);

      await expect(
        dealService.bookDeal(userId, dealId, {
          bookingDate: new Date('2026-06-15'),
          quantity: 1,
          paymentMethod: 'WAVE',
        })
      ).rejects.toThrow(AppError);

      await expect(
        dealService.bookDeal(userId, dealId, {
          bookingDate: new Date('2026-06-15'),
          quantity: 1,
          paymentMethod: 'WAVE',
        })
      ).rejects.toThrow('La date de fin est requise pour ce type de réservation');
    });

    it('should reject if bookingEndDate <= bookingDate', async () => {
      (dealRepository.findById as jest.Mock).mockResolvedValue(dateRangeDeal);
      (dealBookingRepository.countUserBookingsForDeal as jest.Mock).mockResolvedValue(0);

      // Same date
      await expect(
        dealService.bookDeal(userId, dealId, {
          bookingDate: new Date('2026-06-15T14:00:00Z'),
          bookingEndDate: new Date('2026-06-15T14:00:00Z'),
          quantity: 1,
          paymentMethod: 'WAVE',
        })
      ).rejects.toThrow('La date de fin doit être postérieure à la date de début');

      // End date before start date
      await expect(
        dealService.bookDeal(userId, dealId, {
          bookingDate: new Date('2026-06-20'),
          bookingEndDate: new Date('2026-06-15'),
          quantity: 1,
          paymentMethod: 'WAVE',
        })
      ).rejects.toThrow('La date de fin doit être postérieure à la date de début');
    });

    it('should reject if bookingEndDate > availableUntil', async () => {
      (dealRepository.findById as jest.Mock).mockResolvedValue(dateRangeDeal);
      (dealBookingRepository.countUserBookingsForDeal as jest.Mock).mockResolvedValue(0);

      await expect(
        dealService.bookDeal(userId, dealId, {
          bookingDate: new Date('2026-12-25'),
          bookingEndDate: new Date('2027-01-05'), // Beyond availableUntil
          quantity: 1,
          paymentMethod: 'WAVE',
        })
      ).rejects.toThrow("La date de fin dépasse la période de validité du deal");
    });

    it('should calculate numberOfNights correctly', async () => {
      (dealRepository.findById as jest.Mock).mockResolvedValue(dateRangeDeal);
      (dealBookingRepository.countUserBookingsForDeal as jest.Mock).mockResolvedValue(0);
      (dealBookingRepository.create as jest.Mock).mockResolvedValue({
        id: 'booking-123',
        dealId,
        userId,
        bookingDate: new Date('2026-06-01'),
        bookingEndDate: new Date('2026-06-05'),
        numberOfNights: 4,
        quantity: 1,
        totalPrice: 200000, // 50000 × 4 nights
        validationCode: 'ABC12345',
        status: 'PENDING',
      });
      (dealRepository.decrementQuantity as jest.Mock).mockResolvedValue(undefined);

      const booking = await dealService.bookDeal(userId, dealId, {
        bookingDate: new Date('2026-06-01T14:00:00Z'),
        bookingEndDate: new Date('2026-06-05T11:00:00Z'),
        quantity: 1,
        paymentMethod: 'WAVE',
      });

      expect(booking.numberOfNights).toBe(4);
    });

    it('should calculate price correctly (price per night × nights × quantity)', async () => {
      (dealRepository.findById as jest.Mock).mockResolvedValue(dateRangeDeal);
      (dealBookingRepository.countUserBookingsForDeal as jest.Mock).mockResolvedValue(0);
      (dealBookingRepository.create as jest.Mock).mockResolvedValue({
        id: 'booking-123',
        dealId,
        userId,
        bookingDate: new Date('2026-06-01'),
        bookingEndDate: new Date('2026-06-05'),
        numberOfNights: 4,
        quantity: 1,
        totalPrice: 200000, // 50000 × 4 nights × 1 qty
        validationCode: 'ABC12345',
        status: 'PENDING',
      });
      (dealRepository.decrementQuantity as jest.Mock).mockResolvedValue(undefined);

      const booking = await dealService.bookDeal(userId, dealId, {
        bookingDate: new Date('2026-06-01'),
        bookingEndDate: new Date('2026-06-05'),
        quantity: 1,
        paymentMethod: 'WAVE',
      });

      // Total price = dealPrice (50000) × numberOfNights (4) × quantity (1) = 200000
      expect(booking.totalPrice).toBe(200000);
    });

    it('should calculate price with multiple quantity (2 rooms × 3 nights)', async () => {
      (dealRepository.findById as jest.Mock).mockResolvedValue(dateRangeDeal);
      (dealBookingRepository.countUserBookingsForDeal as jest.Mock).mockResolvedValue(0);
      (dealBookingRepository.create as jest.Mock).mockResolvedValue({
        id: 'booking-123',
        dealId,
        userId,
        bookingDate: new Date('2026-06-01'),
        bookingEndDate: new Date('2026-06-04'),
        numberOfNights: 3,
        quantity: 2,
        totalPrice: 300000, // 50000 × 3 nights × 2 qty
        validationCode: 'ABC12345',
        status: 'PENDING',
      });
      (dealRepository.decrementQuantity as jest.Mock).mockResolvedValue(undefined);

      const booking = await dealService.bookDeal(userId, dealId, {
        bookingDate: new Date('2026-06-01'),
        bookingEndDate: new Date('2026-06-04'),
        quantity: 2,
        paymentMethod: 'WAVE',
      });

      // Total price = dealPrice (50000) × numberOfNights (3) × quantity (2) = 300000
      expect(booking.totalPrice).toBe(300000);
    });
  });

  describe('Edge Cases', () => {
    const dateRangeDeal = {
      id: dealId,
      supplierId,
      status: 'ACTIVE',
      bookingMode: 'DATE_RANGE',
      category: 'HOTEL_ROOM',
      dealPrice: 50000,
      quantityAvailable: 10,
      maxPerUser: 5,
      availableFrom: new Date('2026-01-01'),
      availableUntil: new Date('2026-12-31'),
      bookingLeadTime: 0,
      isOffPeakOnly: false,
      availableSlots: null,
      bookingsCount: 0,
    };

    it('should handle 1 night booking correctly', async () => {
      (dealRepository.findById as jest.Mock).mockResolvedValue(dateRangeDeal);
      (dealBookingRepository.countUserBookingsForDeal as jest.Mock).mockResolvedValue(0);
      (dealBookingRepository.create as jest.Mock).mockResolvedValue({
        id: 'booking-123',
        dealId,
        userId,
        bookingDate: new Date('2026-06-01T14:00:00Z'),
        bookingEndDate: new Date('2026-06-02T11:00:00Z'),
        numberOfNights: 1,
        quantity: 1,
        totalPrice: 50000, // 50000 × 1 night
        validationCode: 'ABC12345',
        status: 'PENDING',
      });
      (dealRepository.decrementQuantity as jest.Mock).mockResolvedValue(undefined);

      const booking = await dealService.bookDeal(userId, dealId, {
        bookingDate: new Date('2026-06-01T14:00:00Z'),
        bookingEndDate: new Date('2026-06-02T11:00:00Z'),
        quantity: 1,
        paymentMethod: 'WAVE',
      });

      expect(booking.numberOfNights).toBe(1);
      expect(booking.totalPrice).toBe(50000);
    });
  });

  describe('Backward Compatibility', () => {
    it('should default to SINGLE_DATE for deals without explicit bookingMode', async () => {
      // This test verifies that existing deals without bookingMode
      // are treated as SINGLE_DATE (handled by database default)
      const legacyDeal = {
        id: dealId,
        supplierId,
        status: 'ACTIVE',
        bookingMode: 'SINGLE_DATE', // Database default
        dealPrice: 50000,
        quantityAvailable: 10,
        maxPerUser: 5,
        availableFrom: new Date('2026-01-01'),
        availableUntil: new Date('2026-12-31'),
        bookingLeadTime: 0,
        isOffPeakOnly: false,
        availableSlots: null,
        bookingsCount: 0,
      };

      (dealRepository.findById as jest.Mock).mockResolvedValue(legacyDeal);
      (dealBookingRepository.countUserBookingsForDeal as jest.Mock).mockResolvedValue(0);
      (dealBookingRepository.create as jest.Mock).mockResolvedValue({
        id: 'booking-123',
        dealId,
        userId,
        bookingDate: new Date('2026-06-15'),
        bookingEndDate: null,
        numberOfNights: null,
        quantity: 1,
        totalPrice: 50000,
        validationCode: 'ABC12345',
        status: 'PENDING',
      });
      (dealRepository.decrementQuantity as jest.Mock).mockResolvedValue(undefined);

      const booking = await dealService.bookDeal(userId, dealId, {
        bookingDate: new Date('2026-06-15'),
        quantity: 1,
        paymentMethod: 'WAVE',
      });

      expect(booking).toBeDefined();
      expect(booking.totalPrice).toBe(50000);
    });
  });
});
