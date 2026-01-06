import {
  PromoCode,
  PromoCodeUsage,
  PromoCodeStatus,
  PromoCodeType,
  Prisma,
} from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Promo Code Repository
 * Data access layer for promo codes (admin-created for suppliers)
 */
export class PromoCodeRepository {
  /**
   * Create a new promo code
   */
  async create(data: Prisma.PromoCodeCreateInput): Promise<PromoCode> {
    try {
      return await prisma.promoCode.create({
        data,
        include: {
          applicablePlan: true,
          reservedForSupplier: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error creating promo code', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find promo code by ID
   */
  async findById(id: string): Promise<PromoCode | null> {
    try {
      return await prisma.promoCode.findUnique({
        where: { id },
        include: {
          applicablePlan: true,
          reservedForSupplier: {
            select: {
              id: true,
              businessName: true,
            },
          },
          usages: {
            take: 10,
            orderBy: { usedAt: 'desc' },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding promo code by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find promo code by code string
   */
  async findByCode(code: string): Promise<PromoCode | null> {
    try {
      return await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
        include: {
          applicablePlan: true,
          reservedForSupplier: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding promo code by code', {
        code,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Search promo codes with filters
   */
  async search(params: {
    search?: string;
    status?: PromoCodeStatus;
    type?: PromoCodeType;
    reservedForSupplierId?: string;
    applicablePlanId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ promoCodes: PromoCode[]; total: number }> {
    const {
      search,
      status,
      type,
      reservedForSupplierId,
      applicablePlanId,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    try {
      const where: Prisma.PromoCodeWhereInput = {
        ...(search && {
          OR: [
            { code: { contains: search.toUpperCase() } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(status && { status }),
        ...(type && { type }),
        ...(reservedForSupplierId && { reservedForSupplierId }),
        ...(applicablePlanId && { applicablePlanId }),
      };

      const [promoCodes, total] = await Promise.all([
        prisma.promoCode.findMany({
          where,
          include: {
            applicablePlan: true,
            reservedForSupplier: {
              select: {
                id: true,
                businessName: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.promoCode.count({ where }),
      ]);

      return { promoCodes, total };
    } catch (error) {
      logger.error('Error searching promo codes', {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update promo code
   */
  async update(
    id: string,
    data: Prisma.PromoCodeUpdateInput
  ): Promise<PromoCode> {
    try {
      return await prisma.promoCode.update({
        where: { id },
        data,
        include: {
          applicablePlan: true,
          reservedForSupplier: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating promo code', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete promo code
   */
  async delete(id: string): Promise<PromoCode> {
    try {
      return await prisma.promoCode.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting promo code', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Increment usage count
   */
  async incrementUsage(id: string): Promise<PromoCode> {
    try {
      return await prisma.promoCode.update({
        where: { id },
        data: {
          currentUses: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error('Error incrementing promo code usage', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Record promo code usage
   */
  async recordUsage(data: {
    promoCodeId: string;
    supplierId: string;
    discountAmount: number;
    appliedTo: string;
    subscriptionPaymentId?: string;
  }): Promise<PromoCodeUsage> {
    try {
      return await prisma.promoCodeUsage.create({
        data: {
          promoCodeId: data.promoCodeId,
          supplierId: data.supplierId,
          discountAmount: data.discountAmount,
          appliedTo: data.appliedTo,
          subscriptionPaymentId: data.subscriptionPaymentId,
        },
      });
    } catch (error) {
      logger.error('Error recording promo code usage', {
        data,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get usage count by supplier
   */
  async getUsageCountBySupplierId(
    promoCodeId: string,
    supplierId: string
  ): Promise<number> {
    try {
      return await prisma.promoCodeUsage.count({
        where: {
          promoCodeId,
          supplierId,
        },
      });
    } catch (error) {
      logger.error('Error getting promo code usage count', {
        promoCodeId,
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get promo codes for a supplier (reserved for them)
   */
  async findForSupplier(supplierId: string): Promise<PromoCode[]> {
    try {
      return await prisma.promoCode.findMany({
        where: {
          AND: [
            {
              OR: [
                { reservedForSupplierId: supplierId },
                { reservedForSupplierId: null }, // Public codes
              ],
            },
            {
              OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            },
          ],
          status: 'ACTIVE',
          validFrom: { lte: new Date() },
        },
        include: {
          applicablePlan: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error finding promo codes for supplier', {
        supplierId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update expired promo codes status
   */
  async updateExpiredCodes(): Promise<number> {
    try {
      const result = await prisma.promoCode.updateMany({
        where: {
          status: 'ACTIVE',
          validUntil: { lt: new Date() },
        },
        data: {
          status: 'EXPIRED',
        },
      });
      return result.count;
    } catch (error) {
      logger.error('Error updating expired promo codes', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new PromoCodeRepository();
