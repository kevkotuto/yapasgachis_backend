import { SupplierStore, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Point of Sale Repository
 * Data access layer for points of sale (POS) - Uses SupplierStore model
 */
export class PointOfSaleRepository {
  /**
   * Create a POS
   */
  async create(data: {
    supplierId: string;
    name: string;
    type?: string;
    address: string;
    city: string;
    commune: string;
    neighborhood?: string;
    latitude: number;
    longitude: number;
    phoneNumber?: string;
    email?: string;
    isActive: boolean;
    acceptsOrders?: boolean;
    acceptsPickup?: boolean;
    acceptsDelivery?: boolean;
    description?: string;
    images?: any;
    amenities?: any;
  }): Promise<SupplierStore> {
    try {
      const {
        acceptsPickup,
        acceptsDelivery,
        type,
        acceptsOrders,
        amenities,
        ...storeData
      } = data;

      return await prisma.supplierStore.create({
        data: {
          ...storeData,
          pickupEnabled: acceptsPickup ?? false,
          deliveryEnabled: acceptsDelivery ?? false,
          operatingHours: {},
          // Note: type, acceptsOrders, and amenities are ignored as they don't exist in SupplierStore
        },
      });
    } catch (error) {
      logger.error('Error creating POS', {
        data,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find POS by ID
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
              logo: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding POS by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find supplier's POS
   */
  async findBySupplier(
    supplierId: string,
    activeOnly = false
  ): Promise<SupplierStore[]> {
    try {
      const where: Prisma.SupplierStoreWhereInput = {
        supplierId,
        ...(activeOnly && { isActive: true }),
      };

      return await prisma.supplierStore.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error finding POS by supplier', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Search POS with filters
   */
  async search(filters: {
    latitude?: number;
    longitude?: number;
    radius?: number;
    city?: string;
    commune?: string;
    type?: string;
    acceptsOrders?: boolean;
    acceptsPickup?: boolean;
    acceptsDelivery?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ pos: SupplierStore[]; total: number }> {
    const {
      latitude,
      longitude,
      radius = 10,
      city,
      commune,
      acceptsPickup,
      acceptsDelivery,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    try {
      const where: Prisma.SupplierStoreWhereInput = {
        isActive: true,
        ...(city && { city }),
        ...(commune && { commune }),
        ...(acceptsPickup !== undefined && { pickupEnabled: acceptsPickup }),
        ...(acceptsDelivery !== undefined && {
          deliveryEnabled: acceptsDelivery,
        }),
      };

      // If geolocation provided, filter by distance
      let pos: SupplierStore[];
      let total: number;

      if (latitude && longitude) {
        // Get all matching POS
        const allPos = await prisma.supplierStore.findMany({
          where,
          include: {
            supplier: {
              select: {
                id: true,
                businessName: true,
                logo: true,
              },
            },
          },
        });

        // Calculate distances and filter
        const posWithDistance = allPos
          .map((p) => ({
            ...p,
            distance: this.calculateDistance(
              latitude,
              longitude,
              p.latitude,
              p.longitude
            ),
          }))
          .filter((p) => p.distance <= radius)
          .sort((a, b) => a.distance - b.distance);

        total = posWithDistance.length;
        pos = posWithDistance.slice(skip, skip + limit);
      } else {
        // No geolocation, just paginate
        [pos, total] = await Promise.all([
          prisma.supplierStore.findMany({
            where,
            include: {
              supplier: {
                select: {
                  id: true,
                  businessName: true,
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
      }

      return { pos, total };
    } catch (error) {
      logger.error('Error searching POS', {
        filters,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update POS
   */
  async update(
    id: string,
    data: {
      name?: string;
      type?: string;
      address?: string;
      city?: string;
      commune?: string;
      neighborhood?: string;
      latitude?: number;
      longitude?: number;
      phoneNumber?: string;
      email?: string;
      isActive?: boolean;
      acceptsOrders?: boolean;
      acceptsPickup?: boolean;
      acceptsDelivery?: boolean;
      description?: string;
      images?: any;
      amenities?: any;
    }
  ): Promise<SupplierStore> {
    try {
      const {
        acceptsPickup,
        acceptsDelivery,
        type,
        acceptsOrders,
        amenities,
        ...storeData
      } = data;

      const updateData: any = { ...storeData };

      if (acceptsPickup !== undefined) updateData.pickupEnabled = acceptsPickup;
      if (acceptsDelivery !== undefined)
        updateData.deliveryEnabled = acceptsDelivery;

      // Note: type, acceptsOrders, and amenities are ignored as they don't exist in SupplierStore

      return await prisma.supplierStore.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      logger.error('Error updating POS', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete POS
   */
  async delete(id: string): Promise<SupplierStore> {
    try {
      return await prisma.supplierStore.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting POS', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get POS count by supplier
   */
  async countBySupplier(supplierId: string): Promise<number> {
    try {
      return await prisma.supplierStore.count({
        where: { supplierId },
      });
    } catch (error) {
      logger.error('Error counting POS', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export default new PointOfSaleRepository();
