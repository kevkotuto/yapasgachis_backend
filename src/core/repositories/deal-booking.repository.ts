import { prisma } from '@/infrastructure/database/prisma';
import {
  DealBooking,
  BookingStatus,
  Prisma,
} from '@prisma/client';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Deal Booking Repository
 * Data access layer for deal bookings/reservations
 */
export class DealBookingRepository {
  /**
   * Create a new booking
   */
  async create(data: Prisma.DealBookingCreateInput): Promise<DealBooking> {
    try {
      return await prisma.dealBooking.create({
        data,
        include: {
          deal: {
            select: {
              id: true,
              title: true,
              dealPrice: true,
              supplier: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
              store: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  city: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error creating deal booking', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find booking by ID
   */
  async findById(id: string): Promise<DealBooking | null> {
    try {
      return await prisma.dealBooking.findUnique({
        where: { id },
        include: {
          deal: {
            select: {
              id: true,
              title: true,
              description: true,
              images: true,
              dealPrice: true,
              originalPrice: true,
              includes: true,
              excludes: true,
              terms: true,
              contactPhone: true,
              contactEmail: true,
              supplier: {
                select: {
                  id: true,
                  businessName: true,
                  logo: true,
                },
              },
              store: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  city: true,
                  commune: true,
                  latitude: true,
                  longitude: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding booking by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find booking by booking number
   */
  async findByBookingNumber(bookingNumber: string): Promise<DealBooking | null> {
    try {
      return await prisma.dealBooking.findUnique({
        where: { bookingNumber },
        include: {
          deal: {
            select: {
              id: true,
              title: true,
              supplier: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
              store: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding booking by number', {
        bookingNumber,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find booking by validation code
   */
  async findByValidationCode(validationCode: string): Promise<DealBooking | null> {
    try {
      return await prisma.dealBooking.findUnique({
        where: { validationCode },
        include: {
          deal: {
            select: {
              id: true,
              title: true,
              supplierId: true,
              storeId: true,
              supplier: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
              store: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding booking by validation code', {
        validationCode,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get bookings by user
   */
  async findByUserId(
    userId: string,
    params?: {
      status?: BookingStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<{ bookings: DealBooking[]; total: number }> {
    const { status, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.DealBookingWhereInput = {
        userId,
        ...(status && { status }),
      };

      const [bookings, total] = await Promise.all([
        prisma.dealBooking.findMany({
          where,
          include: {
            deal: {
              select: {
                id: true,
                title: true,
                images: true,
                dealPrice: true,
                supplier: {
                  select: {
                    id: true,
                    businessName: true,
                    logo: true,
                  },
                },
                store: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                    city: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.dealBooking.count({ where }),
      ]);

      return { bookings, total };
    } catch (error) {
      logger.error('Error finding bookings by user ID', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get bookings by deal
   */
  async findByDealId(
    dealId: string,
    params?: {
      status?: BookingStatus;
      bookingDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{ bookings: DealBooking[]; total: number }> {
    const { status, bookingDate, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.DealBookingWhereInput = {
        dealId,
        ...(status && { status }),
        ...(bookingDate && {
          bookingDate: {
            gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
            lt: new Date(bookingDate.setHours(23, 59, 59, 999)),
          },
        }),
      };

      const [bookings, total] = await Promise.all([
        prisma.dealBooking.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ bookingDate: 'asc' }, { createdAt: 'desc' }],
        }),
        prisma.dealBooking.count({ where }),
      ]);

      return { bookings, total };
    } catch (error) {
      logger.error('Error finding bookings by deal ID', {
        dealId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get bookings by supplier
   */
  async findBySupplierId(
    supplierId: string,
    params?: {
      status?: BookingStatus;
      storeId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{ bookings: DealBooking[]; total: number }> {
    const { status, storeId, startDate, endDate, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.DealBookingWhereInput = {
        deal: {
          supplierId,
          ...(storeId && { storeId }),
        },
        ...(status && { status }),
        ...(startDate && { bookingDate: { gte: startDate } }),
        ...(endDate && { bookingDate: { lte: endDate } }),
      };

      const [bookings, total] = await Promise.all([
        prisma.dealBooking.findMany({
          where,
          include: {
            deal: {
              select: {
                id: true,
                title: true,
                store: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { bookingDate: 'asc' },
        }),
        prisma.dealBooking.count({ where }),
      ]);

      return { bookings, total };
    } catch (error) {
      logger.error('Error finding bookings by supplier ID', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update booking
   */
  async update(
    id: string,
    data: Prisma.DealBookingUpdateInput
  ): Promise<DealBooking> {
    try {
      return await prisma.dealBooking.update({
        where: { id },
        data,
        include: {
          deal: {
            select: {
              id: true,
              title: true,
              supplier: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating booking', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update booking status
   */
  async updateStatus(
    id: string,
    status: BookingStatus,
    additionalData?: {
      usedAt?: Date;
      usedByStaffId?: string;
      cancelledAt?: Date;
      cancelReason?: string;
      refundedAt?: Date;
      refundAmount?: number;
    }
  ): Promise<DealBooking> {
    try {
      return await prisma.dealBooking.update({
        where: { id },
        data: {
          status,
          ...additionalData,
        },
      });
    } catch (error) {
      logger.error('Error updating booking status', {
        id,
        status,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Count user bookings for a deal
   */
  async countUserBookingsForDeal(userId: string, dealId: string): Promise<number> {
    try {
      return await prisma.dealBooking.count({
        where: {
          userId,
          dealId,
          status: { notIn: ['CANCELLED', 'EXPIRED'] },
        },
      });
    } catch (error) {
      logger.error('Error counting user bookings for deal', {
        userId,
        dealId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get booking statistics for supplier
   */
  async getSupplierStatistics(
    supplierId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      storeId?: string;
    }
  ): Promise<{
    totalBookings: number;
    confirmedBookings: number;
    usedBookings: number;
    cancelledBookings: number;
    noShowBookings: number;
    totalRevenue: number;
  }> {
    const { startDate, endDate, storeId } = params || {};

    try {
      const where: Prisma.DealBookingWhereInput = {
        deal: {
          supplierId,
          ...(storeId && { storeId }),
        },
        ...(startDate && { createdAt: { gte: startDate } }),
        ...(endDate && { createdAt: { lte: endDate } }),
      };

      const [stats, revenue] = await Promise.all([
        prisma.dealBooking.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        prisma.dealBooking.aggregate({
          where: {
            ...where,
            status: { in: ['CONFIRMED', 'USED'] },
            paidAt: { not: null },
          },
          _sum: { totalPrice: true },
        }),
      ]);

      const getCount = (status: BookingStatus) =>
        stats.find((s) => s.status === status)?._count || 0;

      return {
        totalBookings: stats.reduce((sum, s) => sum + s._count, 0),
        confirmedBookings: getCount('CONFIRMED'),
        usedBookings: getCount('USED'),
        cancelledBookings: getCount('CANCELLED'),
        noShowBookings: getCount('NO_SHOW'),
        totalRevenue: revenue._sum.totalPrice || 0,
      };
    } catch (error) {
      logger.error('Error getting supplier booking statistics', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update expired bookings status
   */
  async updateExpiredBookings(): Promise<number> {
    try {
      const result = await prisma.dealBooking.updateMany({
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] },
          bookingDate: { lt: new Date() },
        },
        data: {
          status: 'EXPIRED',
        },
      });
      return result.count;
    } catch (error) {
      logger.error('Error updating expired bookings', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get upcoming bookings for a date range
   */
  async getUpcomingBookings(
    supplierId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DealBooking[]> {
    try {
      return await prisma.dealBooking.findMany({
        where: {
          deal: { supplierId },
          status: { in: ['PENDING', 'CONFIRMED'] },
          bookingDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          deal: {
            select: {
              id: true,
              title: true,
              store: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ bookingDate: 'asc' }, { bookingSlot: 'asc' }],
      });
    } catch (error) {
      logger.error('Error getting upcoming bookings', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new DealBookingRepository();
