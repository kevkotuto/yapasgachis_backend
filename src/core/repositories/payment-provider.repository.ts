import { PaymentProvider, PaymentProviderStatus, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Payment Provider Repository
 * Data access layer for payment providers (admin-managed)
 */
export class PaymentProviderRepository {
  /**
   * Create a new payment provider
   */
  async create(
    data: Prisma.PaymentProviderCreateInput
  ): Promise<PaymentProvider> {
    try {
      return await prisma.paymentProvider.create({
        data,
      });
    } catch (error) {
      logger.error('Error creating payment provider', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find payment provider by ID
   */
  async findById(id: string): Promise<PaymentProvider | null> {
    try {
      return await prisma.paymentProvider.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding payment provider by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find payment provider by slug
   */
  async findBySlug(slug: string): Promise<PaymentProvider | null> {
    try {
      return await prisma.paymentProvider.findUnique({
        where: { slug },
      });
    } catch (error) {
      logger.error('Error finding payment provider by slug', {
        slug,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get all payment providers
   */
  async findAll(params?: {
    isActive?: boolean;
    status?: PaymentProviderStatus;
    page?: number;
    limit?: number;
  }): Promise<{ providers: PaymentProvider[]; total: number }> {
    try {
      const where: Prisma.PaymentProviderWhereInput = {};

      if (params?.isActive !== undefined) {
        where.isActive = params.isActive;
      }
      if (params?.status) {
        where.status = params.status;
      }

      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;
      const skip = (page - 1) * limit;

      const [providers, total] = await Promise.all([
        prisma.paymentProvider.findMany({
          where,
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
          skip,
          take: limit,
        }),
        prisma.paymentProvider.count({ where }),
      ]);

      return { providers, total };
    } catch (error) {
      logger.error('Error fetching payment providers', {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get active payment providers (for public/client use)
   */
  async findActiveProviders(): Promise<PaymentProvider[]> {
    try {
      return await prisma.paymentProvider.findMany({
        where: {
          isActive: true,
          status: 'ACTIVE',
        },
        orderBy: [
          { isFeatured: 'desc' },
          { displayOrder: 'asc' },
          { name: 'asc' },
        ],
      });
    } catch (error) {
      logger.error('Error fetching active payment providers', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update payment provider
   */
  async update(
    id: string,
    data: Prisma.PaymentProviderUpdateInput
  ): Promise<PaymentProvider> {
    try {
      return await prisma.paymentProvider.update({
        where: { id },
        data,
      });
    } catch (error) {
      logger.error('Error updating payment provider', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete payment provider
   */
  async delete(id: string): Promise<PaymentProvider> {
    try {
      return await prisma.paymentProvider.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting payment provider', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Check if slug exists (for validation)
   */
  async existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
    try {
      const where: Prisma.PaymentProviderWhereInput = { slug };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const count = await prisma.paymentProvider.count({ where });
      return count > 0;
    } catch (error) {
      logger.error('Error checking payment provider slug existence', {
        slug,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update display order
   */
  async updateDisplayOrder(
    updates: { id: string; displayOrder: number }[]
  ): Promise<void> {
    try {
      await prisma.$transaction(
        updates.map((update) =>
          prisma.paymentProvider.update({
            where: { id: update.id },
            data: { displayOrder: update.displayOrder },
          })
        )
      );
    } catch (error) {
      logger.error('Error updating display order', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new PaymentProviderRepository();
