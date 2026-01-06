import { prisma } from '@/infrastructure/database/prisma';
import {
  SubscriptionPlan,
  SubscriptionTier,
  Prisma,
} from '@prisma/client';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Subscription Plan Repository
 * Data access layer for subscription plans (admin-managed)
 */
export class SubscriptionPlanRepository {
  /**
   * Create a new subscription plan
   */
  async create(data: Prisma.SubscriptionPlanCreateInput): Promise<SubscriptionPlan> {
    try {
      return await prisma.subscriptionPlan.create({
        data,
      });
    } catch (error) {
      logger.error('Error creating subscription plan', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find subscription plan by ID
   */
  async findById(id: string): Promise<SubscriptionPlan | null> {
    try {
      return await prisma.subscriptionPlan.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding subscription plan by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find subscription plan by tier
   */
  async findByTier(tier: SubscriptionTier): Promise<SubscriptionPlan | null> {
    try {
      return await prisma.subscriptionPlan.findUnique({
        where: { tier },
      });
    } catch (error) {
      logger.error('Error finding subscription plan by tier', {
        tier,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get all subscription plans
   */
  async findAll(params?: {
    isActive?: boolean;
    isPublic?: boolean;
  }): Promise<SubscriptionPlan[]> {
    try {
      const where: Prisma.SubscriptionPlanWhereInput = {};

      if (params?.isActive !== undefined) {
        where.isActive = params.isActive;
      }
      if (params?.isPublic !== undefined) {
        where.isPublic = params.isPublic;
      }

      return await prisma.subscriptionPlan.findMany({
        where,
        orderBy: { monthlyPrice: 'asc' },
      });
    } catch (error) {
      logger.error('Error fetching subscription plans', {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get public active plans (for supplier registration)
   */
  async findPublicPlans(): Promise<SubscriptionPlan[]> {
    try {
      return await prisma.subscriptionPlan.findMany({
        where: {
          isActive: true,
          isPublic: true,
        },
        orderBy: { monthlyPrice: 'asc' },
      });
    } catch (error) {
      logger.error('Error fetching public plans', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update subscription plan
   */
  async update(
    id: string,
    data: Prisma.SubscriptionPlanUpdateInput
  ): Promise<SubscriptionPlan> {
    try {
      return await prisma.subscriptionPlan.update({
        where: { id },
        data,
      });
    } catch (error) {
      logger.error('Error updating subscription plan', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete subscription plan
   */
  async delete(id: string): Promise<SubscriptionPlan> {
    try {
      return await prisma.subscriptionPlan.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting subscription plan', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Count suppliers using a plan
   */
  async countSuppliers(planId: string): Promise<number> {
    try {
      return await prisma.supplierProfile.count({
        where: { subscriptionPlanId: planId },
      });
    } catch (error) {
      logger.error('Error counting suppliers for plan', {
        planId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new SubscriptionPlanRepository();
