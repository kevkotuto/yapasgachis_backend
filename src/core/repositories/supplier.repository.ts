import { prisma } from '@/infrastructure/database/prisma';
import {
  SupplierProfile,
  SubscriptionTier,
  SupplierType,
  Prisma,
} from '@prisma/client';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Supplier Repository
 * Data access layer for supplier profiles
 */
export class SupplierRepository {
  /**
   * Create a new supplier profile
   */
  async create(
    userId: string,
    data: Prisma.SupplierProfileCreateInput
  ): Promise<SupplierProfile> {
    try {
      return await prisma.supplierProfile.create({
        data: {
          ...data,
          user: { connect: { id: userId } },
        },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error creating supplier profile', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find supplier profile by user ID
   */
  async findByUserId(userId: string): Promise<SupplierProfile | null> {
    try {
      return await prisma.supplierProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              firstName: true,
              lastName: true,
              city: true,
              commune: true,
            },
          },
          products: {
            select: {
              id: true,
              title: true,
              status: true,
            },
            take: 10,
          },
        },
      });
    } catch (error) {
      logger.error('Error finding supplier by user ID', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find supplier profile by ID
   */
  async findById(id: string): Promise<SupplierProfile | null> {
    try {
      return await prisma.supplierProfile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              firstName: true,
              lastName: true,
              city: true,
              commune: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding supplier by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update supplier profile
   */
  async update(
    id: string,
    data: Prisma.SupplierProfileUpdateInput
  ): Promise<SupplierProfile> {
    try {
      return await prisma.supplierProfile.update({
        where: { id },
        data,
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating supplier profile', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete supplier profile
   */
  async delete(id: string): Promise<SupplierProfile> {
    try {
      return await prisma.supplierProfile.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting supplier profile', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Search suppliers with filters
   */
  async search(params: {
    search?: string;
    type?: SupplierType;
    subscriptionTier?: SubscriptionTier;
    city?: string;
    latitude?: number;
    longitude?: number;
    radius?: number; // in km
    page?: number;
    limit?: number;
  }): Promise<{ suppliers: SupplierProfile[]; total: number }> {
    const {
      search,
      type,
      subscriptionTier,
      city,
      latitude,
      longitude,
      radius = 10,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    try {
      const where: Prisma.SupplierProfileWhereInput = {
        ...(search && {
          OR: [
            { businessName: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            {
              user: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          ],
        }),
        ...(type && { type }),
        ...(subscriptionTier && { subscriptionTier }),
        ...(city && { user: { city: { equals: city, mode: 'insensitive' } } }),
      };

      // If geolocation provided, filter by distance
      let suppliers: SupplierProfile[];
      let total: number;

      if (latitude && longitude) {
        // Fetch all matching suppliers with location
        const allSuppliers = await prisma.supplierProfile.findMany({
          where: {
            ...where,
            latitude: { not: null },
            longitude: { not: null },
          },
          include: {
            user: {
              select: {
                id: true,
                phoneNumber: true,
                email: true,
                firstName: true,
                lastName: true,
                city: true,
                commune: true,
              },
            },
          },
        });

        // Calculate distance and filter
        const suppliersWithDistance = allSuppliers
          .map((supplier) => {
            const distance = this.calculateDistance(
              latitude,
              longitude,
              supplier.latitude!,
              supplier.longitude!
            );
            return { ...supplier, distance };
          })
          .filter((supplier) => supplier.distance <= radius)
          .sort((a, b) => a.distance - b.distance);

        total = suppliersWithDistance.length;
        suppliers = suppliersWithDistance.slice(skip, skip + limit);
      } else {
        // No geolocation, use standard pagination
        [suppliers, total] = await Promise.all([
          prisma.supplierProfile.findMany({
            where,
            include: {
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  city: true,
                  commune: true,
                },
              },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
          }),
          prisma.supplierProfile.count({ where }),
        ]);
      }

      return { suppliers, total };
    } catch (error) {
      logger.error('Error searching suppliers', {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get supplier statistics
   */
  async getStatistics(userId: string): Promise<{
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    totalRevenue: number;
    avgRating: number;
    totalReviews: number;
  }> {
    try {
      const supplier = await prisma.supplierProfile.findUnique({
        where: { userId },
        include: {
          products: {
            select: {
              id: true,
              status: true,
              discountedPrice: true,
              orderItems: {
                include: {
                  order: {
                    select: {
                      id: true,
                      status: true,
                      total: true,
                    },
                  },
                },
              },
              reviews: {
                select: {
                  rating: true,
                },
              },
            },
          },
        },
      });

      if (!supplier) {
        return {
          totalProducts: 0,
          activeProducts: 0,
          totalOrders: 0,
          totalRevenue: 0,
          avgRating: 0,
          totalReviews: 0,
        };
      }

      const supplierWithProducts = supplier as typeof supplier & {
        products: Array<{
          id: string;
          status: string;
          discountedPrice: number;
          orderItems: Array<{
            order: { id: string; status: string; total: number };
          }>;
          reviews: Array<{ rating: number }>;
        }>;
      };

      const totalProducts = supplierWithProducts.products.length;
      const activeProducts = supplierWithProducts.products.filter(
        (p) => p.status === 'ACTIVE'
      ).length;

      // Calculate orders and revenue
      let totalOrders = 0;
      let totalRevenue = 0;
      const orderIds = new Set<string>();

      supplierWithProducts.products.forEach((product) => {
        product.orderItems.forEach((item) => {
          if (item.order.status === 'COMPLETED') {
            orderIds.add(item.order.id);
            totalRevenue += Number(item.order.total);
          }
        });
      });

      totalOrders = orderIds.size;

      // Calculate average rating
      let totalRatings = 0;
      let totalReviews = 0;

      supplierWithProducts.products.forEach((product) => {
        product.reviews.forEach((review) => {
          totalRatings += review.rating;
          totalReviews++;
        });
      });

      const avgRating = totalReviews > 0 ? totalRatings / totalReviews : 0;

      return {
        totalProducts,
        activeProducts,
        totalOrders,
        totalRevenue,
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews,
      };
    } catch (error) {
      logger.error('Error getting supplier statistics', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update subscription tier
   */
  async updateSubscription(
    id: string,
    tier: SubscriptionTier,
    expiresAt: Date
  ): Promise<SupplierProfile> {
    try {
      return await prisma.supplierProfile.update({
        where: { id },
        data: {
          subscriptionTier: tier,
          subscriptionEndDate: expiresAt,
        },
      });
    } catch (error) {
      logger.error('Error updating supplier subscription', {
        id,
        tier,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
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

export default new SupplierRepository();
