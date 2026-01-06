import { SupplierStore, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Supplier Store Repository
 * Data access layer for supplier stores/branches (multi-location support)
 */
export class SupplierStoreRepository {
  /**
   * Create a new store
   */
  async create(data: Prisma.SupplierStoreCreateInput): Promise<SupplierStore> {
    try {
      return await prisma.supplierStore.create({
        data,
        include: {
          supplier: {
            select: {
              id: true,
              businessName: true,
              supplierType: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error creating supplier store', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find store by ID
   */
  async findById(id: string): Promise<SupplierStore | null> {
    try {
      return await prisma.supplierStore.findUnique({
        where: { id },
        include: {
          supplier: {
            select: {
              id: true,
              businessName: true,
              supplierType: true,
              logo: true,
            },
          },
          products: {
            where: { status: 'ACTIVE' },
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          deals: {
            where: { status: 'ACTIVE' },
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding store by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find all stores for a supplier
   */
  async findBySupplierId(supplierId: string): Promise<SupplierStore[]> {
    try {
      return await prisma.supplierStore.findMany({
        where: { supplierId },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      logger.error('Error finding stores by supplier ID', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Search stores with filters
   */
  async search(params: {
    supplierId?: string;
    search?: string;
    city?: string;
    commune?: string;
    latitude?: number;
    longitude?: number;
    radius?: number; // km
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ stores: SupplierStore[]; total: number }> {
    const {
      supplierId,
      search,
      city,
      commune,
      latitude,
      longitude,
      radius = 10,
      isActive = true,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    try {
      const where: Prisma.SupplierStoreWhereInput = {
        ...(supplierId && { supplierId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
            {
              supplier: {
                businessName: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        }),
        ...(city && { city: { equals: city, mode: 'insensitive' } }),
        ...(commune && { commune: { equals: commune, mode: 'insensitive' } }),
        ...(isActive !== undefined && { isActive }),
        isTemporarilyClosed: false,
      };

      // If geolocation provided, filter by distance
      if (latitude && longitude) {
        const allStores = await prisma.supplierStore.findMany({
          where: {
            ...where,
            NOT: [{ latitude: null }, { longitude: null }],
          },
          include: {
            supplier: {
              select: {
                id: true,
                businessName: true,
                supplierType: true,
                logo: true,
              },
            },
          },
        });

        const storesWithDistance = allStores
          .map((store) => {
            const distance = this.calculateDistance(
              latitude,
              longitude,
              store.latitude,
              store.longitude
            );
            return { ...store, distance };
          })
          .filter((store) => store.distance <= radius)
          .sort((a, b) => a.distance - b.distance);

        const total = storesWithDistance.length;
        const stores = storesWithDistance.slice(skip, skip + limit);

        return { stores, total };
      }

      // Standard pagination without geolocation
      const [stores, total] = await Promise.all([
        prisma.supplierStore.findMany({
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
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.supplierStore.count({ where }),
      ]);

      return { stores, total };
    } catch (error) {
      logger.error('Error searching stores', {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update store
   */
  async update(
    id: string,
    data: Prisma.SupplierStoreUpdateInput
  ): Promise<SupplierStore> {
    try {
      return await prisma.supplierStore.update({
        where: { id },
        data,
        include: {
          supplier: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating store', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete store
   */
  async delete(id: string): Promise<SupplierStore> {
    try {
      return await prisma.supplierStore.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting store', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Count stores for a supplier
   */
  async countBySupplierId(supplierId: string): Promise<number> {
    try {
      return await prisma.supplierStore.count({
        where: { supplierId },
      });
    } catch (error) {
      logger.error('Error counting stores', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get store statistics
   */
  async getStatistics(storeId: string): Promise<{
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    totalDeals: number;
    activeDeals: number;
  }> {
    try {
      const [products, orders, deals] = await Promise.all([
        prisma.product.groupBy({
          by: ['status'],
          where: { storeId },
          _count: true,
        }),
        prisma.order.count({
          where: { storeId },
        }),
        prisma.deal.groupBy({
          by: ['status'],
          where: { storeId },
          _count: true,
        }),
      ]);

      const totalProducts = products.reduce((sum, p) => sum + p._count, 0);
      const activeProducts =
        products.find((p) => p.status === 'ACTIVE')?._count || 0;
      const totalDeals = deals.reduce((sum, d) => sum + d._count, 0);
      const activeDeals = deals.find((d) => d.status === 'ACTIVE')?._count || 0;

      return {
        totalProducts,
        activeProducts,
        totalOrders: orders,
        totalDeals,
        activeDeals,
      };
    } catch (error) {
      logger.error('Error getting store statistics', {
        storeId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Set temporary closure
   */
  async setTemporaryClosure(
    id: string,
    isClosed: boolean,
    reason?: string
  ): Promise<SupplierStore> {
    try {
      return await prisma.supplierStore.update({
        where: { id },
        data: {
          isTemporarilyClosed: isClosed,
          closureReason: isClosed ? reason : null,
        },
      });
    } catch (error) {
      logger.error('Error setting store temporary closure', {
        id,
        isClosed,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
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

export default new SupplierStoreRepository();
