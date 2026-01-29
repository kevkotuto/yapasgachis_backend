import { DealRoom, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Deal Option Repository
 * Data access layer for deal options/variants
 */
export class DealRoomRepository {
  /**
   * Create a new deal option
   */
  async create(data: {
    dealId: string;
    title: string;
    description?: string;
    price: number;
    capacity?: string;
    size?: string;
    floor?: string;
    features?: any;
    imageUrl?: string;
    stock?: number;
    sortOrder?: number;
  }): Promise<DealRoom> {
    try {
      return await prisma.dealRoom.create({
        data: {
          dealId: data.dealId,
          title: data.title,
          description: data.description,
          price: data.price,
          capacity: data.capacity,
          size: data.size,
          floor: data.floor,
          features: data.features,
          imageUrl: data.imageUrl,
          stock: data.stock,
          sortOrder: data.sortOrder || 0,
        },
      });
    } catch (error) {
      logger.error('Error creating deal option', {
        data,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find deal option by ID
   */
  async findById(id: string): Promise<DealRoom | null> {
    try {
      return await prisma.dealRoom.findUnique({
        where: { id },
        include: {
          deal: {
            select: {
              id: true,
              title: true,
              supplierId: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding deal option by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find all options for a deal
   */
  async findByDealId(dealId: string): Promise<DealRoom[]> {
    try {
      return await prisma.dealRoom.findMany({
        where: { dealId },
        orderBy: { sortOrder: 'asc' },
      });
    } catch (error) {
      logger.error('Error finding deal options by deal ID', {
        dealId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find active options for a deal
   */
  async findActiveDealRooms(dealId: string): Promise<DealRoom[]> {
    try {
      return await prisma.dealRoom.findMany({
        where: {
          dealId,
          isActive: true,
        },
        orderBy: { sortOrder: 'asc' },
      });
    } catch (error) {
      logger.error('Error finding active deal options', {
        dealId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update a deal option
   */
  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      capacity?: string;
      size?: string;
      floor?: string;
      features?: any;
      imageUrl?: string;
      stock?: number;
      isActive?: boolean;
      sortOrder?: number;
    }
  ): Promise<DealRoom> {
    try {
      return await prisma.dealRoom.update({
        where: { id },
        data,
      });
    } catch (error) {
      logger.error('Error updating deal option', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete a deal option
   */
  async delete(id: string): Promise<DealRoom> {
    try {
      return await prisma.dealRoom.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting deal option', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update stock for a deal option
   */
  async updateStock(id: string, quantity: number): Promise<DealRoom> {
    try {
      return await prisma.dealRoom.update({
        where: { id },
        data: {
          stock: { decrement: quantity },
        },
      });
    } catch (error) {
      logger.error('Error updating deal option stock', {
        id,
        quantity,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Bulk update sort order
   */
  async updateSortOrder(
    updates: Array<{ id: string; sortOrder: number }>
  ): Promise<void> {
    try {
      await prisma.$transaction(
        updates.map((update) =>
          prisma.dealRoom.update({
            where: { id: update.id },
            data: { sortOrder: update.sortOrder },
          })
        )
      );
    } catch (error) {
      logger.error('Error updating deal options sort order', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Check if option is available (stock)
   */
  async checkAvailability(id: string, quantity: number): Promise<boolean> {
    try {
      const option = await prisma.dealRoom.findUnique({
        where: { id },
        select: { stock: true, isActive: true },
      });

      if (!option || !option.isActive) {
        return false;
      }

      // If stock is null, unlimited availability
      if (option.stock === null) {
        return true;
      }

      return option.stock >= quantity;
    } catch (error) {
      logger.error('Error checking deal option availability', {
        id,
        quantity,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new DealRoomRepository();
