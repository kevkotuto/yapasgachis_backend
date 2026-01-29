import { StockMovement, StockMovementType, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Stock Movement Repository
 * Data access layer for stock movements
 */
export class StockMovementRepository {
  /**
   * Create a stock movement
   */
  async create(data: Prisma.StockMovementCreateInput): Promise<StockMovement> {
    try {
      return await prisma.stockMovement.create({
        data,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              quantity: true,
              quantityAvailable: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error creating stock movement', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find stock movements by product ID
   */
  async findByProductId(
    productId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ movements: StockMovement[]; total: number }> {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    try {
      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where: { productId },
          include: {
            product: {
              select: {
                id: true,
                title: true,
                quantity: true,
                quantityAvailable: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.stockMovement.count({ where: { productId } }),
      ]);

      return { movements, total };
    } catch (error) {
      logger.error('Error finding stock movements by product', {
        productId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find stock movements by supplier ID
   */
  async findBySupplierId(
    supplierId: string,
    options?: {
      type?: StockMovementType;
      productId?: string;
      storeId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{ movements: StockMovement[]; total: number }> {
    const {
      type,
      productId,
      storeId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = options || {};
    const skip = (page - 1) * limit;

    try {
      const where: any = {
        supplierId,
        ...(type && { type }),
        ...(productId && { productId }),
        ...(storeId && { storeId }),
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                title: true,
                quantity: true,
                quantityAvailable: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.stockMovement.count({ where }),
      ]);

      return { movements, total };
    } catch (error) {
      logger.error('Error finding stock movements by supplier', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find stock movements by store ID
   */
  async findByStoreId(
    storeId: string,
    options?: {
      type?: StockMovementType;
      productId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{ movements: StockMovement[]; total: number }> {
    const {
      type,
      productId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = options || {};
    const skip = (page - 1) * limit;

    try {
      const where: any = {
        storeId,
        ...(type && { type }),
        ...(productId && { productId }),
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                title: true,
                quantity: true,
                quantityAvailable: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.stockMovement.count({ where }),
      ]);

      return { movements, total };
    } catch (error) {
      logger.error('Error finding stock movements by store', {
        storeId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get stock movements with advanced filtering
   */
  async list(filters: {
    supplierId?: string;
    storeId?: string;
    productId?: string;
    type?: StockMovementType;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ movements: StockMovement[]; total: number }> {
    const {
      supplierId,
      storeId,
      productId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    try {
      const where: any = {
        ...(supplierId && { supplierId }),
        ...(storeId && { storeId }),
        ...(productId && { productId }),
        ...(type && { type }),
        ...(startDate &&
          endDate && {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      };

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                title: true,
                quantity: true,
                quantityAvailable: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.stockMovement.count({ where }),
      ]);

      return { movements, total };
    } catch (error) {
      logger.error('Error listing stock movements', {
        filters,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get stock movement by ID
   */
  async findById(id: string): Promise<StockMovement | null> {
    try {
      return await prisma.stockMovement.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              quantity: true,
              quantityAvailable: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding stock movement by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new StockMovementRepository();
