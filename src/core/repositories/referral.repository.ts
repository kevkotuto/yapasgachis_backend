import { ReferralCode, Referral, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Referral Repository
 * Data access layer for referral system
 */
export class ReferralRepository {
  /**
   * Create a referral code
   */
  async createCode(data: {
    userId: string;
    code: string;
    maxUses?: number;
    expiresAt?: Date;
  }): Promise<ReferralCode> {
    try {
      return await prisma.referralCode.create({
        data: {
          userId: data.userId,
          code: data.code,
          maxUses: data.maxUses,
          expiresAt: data.expiresAt,
        },
      });
    } catch (error) {
      logger.error('Error creating referral code', {
        data,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find referral code by code string
   */
  async findByCode(code: string): Promise<ReferralCode | null> {
    try {
      return await prisma.referralCode.findUnique({
        where: { code },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding referral code', {
        code,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find user's referral codes
   */
  async findUserCodes(userId: string): Promise<ReferralCode[]> {
    try {
      return await prisma.referralCode.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error finding user referral codes', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update referral code
   */
  async updateCode(
    id: string,
    data: {
      isActive?: boolean;
      maxUses?: number;
      expiresAt?: Date;
    }
  ): Promise<ReferralCode> {
    try {
      return await prisma.referralCode.update({
        where: { id },
        data,
      });
    } catch (error) {
      logger.error('Error updating referral code', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Increment code usage
   */
  async incrementUsage(id: string): Promise<ReferralCode> {
    try {
      return await prisma.referralCode.update({
        where: { id },
        data: {
          timesUsed: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error('Error incrementing referral code usage', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Create a referral
   */
  async createReferral(data: {
    referralCodeId: string;
    referrerId: string;
    referredUserId: string;
  }): Promise<Referral> {
    try {
      return await prisma.referral.create({
        data: {
          referralCodeId: data.referralCodeId,
          referrerId: data.referrerId,
          referredUserId: data.referredUserId,
          status: 'PENDING',
        },
      });
    } catch (error) {
      logger.error('Error creating referral', {
        data,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find referral by referred user
   */
  async findByReferredUser(userId: string): Promise<Referral | null> {
    try {
      return await prisma.referral.findFirst({
        where: { referredUserId: userId },
        include: {
          referralCode: true,
          referrer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding referral by referred user', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get user's referrals (people they referred)
   */
  async getUserReferrals(
    userId: string,
    page = 1,
    limit = 20,
    status?: string
  ): Promise<{ referrals: Referral[]; total: number }> {
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.ReferralWhereInput = {
        referrerId: userId,
        ...(status && { status: status as Prisma.EnumReferralStatusFilter }),
      };

      const [referrals, total] = await Promise.all([
        prisma.referral.findMany({
          where,
          include: {
            referralCode: true,
            referredUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.referral.count({ where }),
      ]);

      return { referrals, total };
    } catch (error) {
      logger.error('Error getting user referrals', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update referral status
   */
  async updateReferralStatus(
    id: string,
    status: string,
    rewardEarned?: number
  ): Promise<Referral> {
    try {
      const statusValue = status as
        | 'PENDING'
        | 'COMPLETED'
        | 'REWARDED'
        | 'EXPIRED';
      return await prisma.referral.update({
        where: { id },
        data: {
          status: statusValue,
          rewardEarned,
          completedAt: status === 'COMPLETED' ? new Date() : undefined,
        },
      });
    } catch (error) {
      logger.error('Error updating referral status', {
        id,
        status,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get referral stats
   */
  async getUserReferralStats(userId: string) {
    try {
      const [total, pending, completed, rewarded, totalRewards] =
        await Promise.all([
          prisma.referral.count({ where: { referrerId: userId } }),
          prisma.referral.count({
            where: { referrerId: userId, status: 'PENDING' },
          }),
          prisma.referral.count({
            where: { referrerId: userId, status: 'COMPLETED' },
          }),
          prisma.referral.count({
            where: { referrerId: userId, status: 'REWARDED' },
          }),
          prisma.referral.aggregate({
            where: { referrerId: userId, status: 'REWARDED' },
            _sum: { rewardEarned: true },
          }),
        ]);

      return {
        totalReferrals: total,
        pendingReferrals: pending,
        completedReferrals: completed,
        rewardedReferrals: rewarded,
        totalRewardsEarned: totalRewards._sum.rewardEarned || 0,
      };
    } catch (error) {
      logger.error('Error getting referral stats', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Check if code exists
   */
  async codeExists(code: string): Promise<boolean> {
    try {
      const count = await prisma.referralCode.count({
        where: { code },
      });
      return count > 0;
    } catch (error) {
      logger.error('Error checking if code exists', {
        code,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete referral code
   */
  async deleteCode(id: string): Promise<ReferralCode> {
    try {
      return await prisma.referralCode.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting referral code', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new ReferralRepository();
