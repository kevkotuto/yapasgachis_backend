import {
  Deal,
  DealBooking,
  DealStatus,
  DealCategory,
  BookingStatus,
  Prisma,
} from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Deal Repository
 * Data access layer for deals/special offers
 */
export class DealRepository {
  /**
   * Create a new deal
   */
  async create(data: Prisma.DealCreateInput): Promise<Deal> {
    try {
      return await prisma.deal.create({
        data,
        include: {
          supplier: {
            select: {
              id: true,
              businessName: true,
              supplierType: true,
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
      });
    } catch (error) {
      logger.error('Error creating deal', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find deal by ID
   */
  async findById(id: string): Promise<Deal | null> {
    try {
      return await prisma.deal.findUnique({
        where: { id },
        include: {
          supplier: {
            select: {
              id: true,
              businessName: true,
              supplierType: true,
              logo: true,
              user: {
                select: {
                  phoneNumber: true,
                  email: true,
                },
              },
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
              operatingHours: true,
              phoneNumber: true,
            },
          },
          bookings: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding deal by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Search deals with filters
   */
  async search(params: {
    search?: string;
    category?: DealCategory;
    status?: DealStatus;
    supplierId?: string;
    storeId?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    minPrice?: number;
    maxPrice?: number;
    isOffPeakOnly?: boolean;
    availableNow?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ deals: Deal[]; total: number }> {
    const {
      search,
      category,
      status = 'ACTIVE',
      supplierId,
      storeId,
      city,
      latitude,
      longitude,
      radius = 10,
      minPrice,
      maxPrice,
      isOffPeakOnly,
      availableNow,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;
    const now = new Date();

    try {
      const where: Prisma.DealWhereInput = {
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            {
              supplier: {
                businessName: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        }),
        ...(category && { category }),
        ...(status && { status }),
        ...(supplierId && { supplierId }),
        ...(storeId && { storeId }),
        ...(city && { store: { city: { equals: city, mode: 'insensitive' } } }),
        ...(minPrice !== undefined && { dealPrice: { gte: minPrice } }),
        ...(maxPrice !== undefined && { dealPrice: { lte: maxPrice } }),
        ...(isOffPeakOnly !== undefined && { isOffPeakOnly }),
        ...(availableNow && {
          availableFrom: { lte: now },
          availableUntil: { gte: now },
          quantityAvailable: { gt: 0 },
        }),
      };

      // If geolocation provided, filter by distance
      if (latitude && longitude) {
        const allDeals = await prisma.deal.findMany({
          where,
          include: {
            supplier: {
              select: {
                id: true,
                businessName: true,
                supplierType: true,
                logo: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        });

        const dealsWithDistance = allDeals
          .filter((deal) => deal.store?.latitude && deal.store?.longitude)
          .map((deal) => {
            const distance = this.calculateDistance(
              latitude,
              longitude,
              deal.store.latitude,
              deal.store.longitude
            );
            return { ...deal, distance };
          })
          .filter((deal) => deal.distance <= radius)
          .sort((a, b) => a.distance - b.distance);

        const total = dealsWithDistance.length;
        const deals = dealsWithDistance.slice(skip, skip + limit);

        return { deals, total };
      }

      // Standard pagination
      const [deals, total] = await Promise.all([
        prisma.deal.findMany({
          where,
          include: {
            supplier: {
              select: {
                id: true,
                businessName: true,
                supplierType: true,
                logo: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                latitude: true,
                longitude: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: [
            { isOffPeakOnly: 'desc' }, // Prioritize off-peak deals
            { createdAt: 'desc' },
          ],
        }),
        prisma.deal.count({ where }),
      ]);

      return { deals, total };
    } catch (error) {
      logger.error('Error searching deals', {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get deals by supplier (with pagination)
   */
  async findBySupplierId(
    supplierId: string,
    options?: {
      status?: DealStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<{ deals: Deal[]; total: number }> {
    try {
      const { status, page = 1, limit = 20 } = options || {};
      const skip = (page - 1) * limit;

      const where = {
        supplierId,
        ...(status && { status }),
      };

      const [deals, total] = await Promise.all([
        prisma.deal.findMany({
          where,
          include: {
            store: {
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
            bookings: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.deal.count({ where }),
      ]);

      return { deals, total };
    } catch (error) {
      logger.error('Error finding deals by supplier ID', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update deal
   */
  async update(id: string, data: Prisma.DealUpdateInput): Promise<Deal> {
    try {
      return await prisma.deal.update({
        where: { id },
        data,
        include: {
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
      });
    } catch (error) {
      logger.error('Error updating deal', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete deal
   */
  async delete(id: string): Promise<Deal> {
    try {
      return await prisma.deal.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting deal', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Decrement available quantity
   */
  async decrementQuantity(id: string, quantity: number = 1): Promise<Deal> {
    try {
      return await prisma.deal.update({
        where: { id },
        data: {
          quantityAvailable: { decrement: quantity },
          bookingsCount: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error('Error decrementing deal quantity', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Increment used count
   */
  async incrementUsedCount(id: string): Promise<Deal> {
    try {
      return await prisma.deal.update({
        where: { id },
        data: {
          usedCount: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error('Error incrementing deal used count', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Increment view count
   */
  async incrementViews(id: string): Promise<void> {
    try {
      await prisma.deal.update({
        where: { id },
        data: {
          views: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error('Error incrementing deal views', {
        id,
        error: (error as Error).message,
      });
      // Don't throw - view count is not critical
    }
  }

  /**
   * Update expired deals status
   */
  async updateExpiredDeals(): Promise<number> {
    try {
      const result = await prisma.deal.updateMany({
        where: {
          status: 'ACTIVE',
          availableUntil: { lt: new Date() },
        },
        data: {
          status: 'EXPIRED',
        },
      });
      return result.count;
    } catch (error) {
      logger.error('Error updating expired deals', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get deals pending moderation
   */
  async findPendingModeration(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ deals: Deal[]; total: number }> {
    const { page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.DealWhereInput = {
        status: 'PENDING_APPROVAL',
      };

      const [deals, total] = await Promise.all([
        prisma.deal.findMany({
          where,
          include: {
            supplier: {
              select: {
                id: true,
                businessName: true,
                supplierType: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'asc' },
        }),
        prisma.deal.count({ where }),
      ]);

      return { deals, total };
    } catch (error) {
      logger.error('Error finding deals pending moderation', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Count deals by supplier
   */
  async countBySupplierId(supplierId: string): Promise<number> {
    try {
      return await prisma.deal.count({
        where: { supplierId },
      });
    } catch (error) {
      logger.error('Error counting deals by supplier', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export default new DealRepository();
