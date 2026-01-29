import {
  PointTransaction,
  Prisma,
  PointTransactionType,
  RewardTier,
} from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Reward Repository
 * Data access layer for user rewards and points
 */
export class RewardRepository {
  /**
   * Get user's reward summary
   */
  async getUserRewards(userId: string) {
    try {
      return await prisma.userRewards.findUnique({
        where: { userId },
      });
    } catch (error) {
      logger.error('Error getting user rewards', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Create or update user rewards
   */
  async upsertUserRewards(
    userId: string,
    data: {
      totalPoints?: number;
      availablePoints?: number;
      lifetimePoints?: number;
      currentTier?: RewardTier;
    }
  ) {
    try {
      return await prisma.userRewards.upsert({
        where: { userId },
        create: {
          userId,
          totalPoints: data.totalPoints || 0,
          availablePoints: data.availablePoints || 0,
          lifetimePoints: data.lifetimePoints || 0,
          currentTier: data.currentTier || RewardTier.BRONZE,
        },
        update: data,
      });
    } catch (error) {
      logger.error('Error upserting user rewards', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Create a point transaction
   */
  async createTransaction(data: {
    userId: string;
    amount: number;
    type: PointTransactionType;
    source: string;
    description: string;
    reference?: string;
    expiresAt?: Date;
  }): Promise<PointTransaction> {
    try {
      return await prisma.pointTransaction.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          type: data.type,
          source: data.source,
          description: data.description,
          reference: data.reference,
          expiresAt: data.expiresAt,
          balance: 0, // Will be calculated after
        },
      });
    } catch (error) {
      logger.error('Error creating point transaction', {
        data,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get user's point transactions
   */
  async getTransactions(
    userId: string,
    page = 1,
    limit = 20,
    type?: PointTransactionType
  ): Promise<{ transactions: PointTransaction[]; total: number }> {
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.PointTransactionWhereInput = {
        userId,
        ...(type && { type }),
      };

      const [transactions, total] = await Promise.all([
        prisma.pointTransaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.pointTransaction.count({ where }),
      ]);

      return { transactions, total };
    } catch (error) {
      logger.error('Error getting point transactions', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Add points to user
   */
  async addPoints(
    userId: string,
    amount: number,
    source: string,
    description: string,
    reference?: string,
    expiresAt?: Date
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Create transaction
        const transaction = await tx.pointTransaction.create({
          data: {
            userId,
            amount,
            type: PointTransactionType.EARNED,
            source,
            description,
            reference,
            expiresAt,
            balance: 0,
          },
        });

        // Update user rewards
        const rewards = await tx.userRewards.upsert({
          where: { userId },
          create: {
            userId,
            totalPoints: amount,
            availablePoints: amount,
            lifetimePoints: amount,
            currentTier: RewardTier.BRONZE,
          },
          update: {
            totalPoints: { increment: amount },
            availablePoints: { increment: amount },
            lifetimePoints: { increment: amount },
          },
        });

        // Update transaction balance
        await tx.pointTransaction.update({
          where: { id: transaction.id },
          data: { balance: rewards.totalPoints },
        });

        return { transaction, rewards };
      });
    } catch (error) {
      logger.error('Error adding points', {
        userId,
        amount,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Deduct points from user
   */
  async deductPoints(
    userId: string,
    amount: number,
    description: string,
    reference?: string
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Check available points
        const rewards = await tx.userRewards.findUnique({
          where: { userId },
        });

        if (!rewards || rewards.availablePoints < amount) {
          throw new Error('Points insuffisants');
        }

        // Create transaction
        const transaction = await tx.pointTransaction.create({
          data: {
            userId,
            amount: -amount,
            type: PointTransactionType.REDEEMED,
            source: 'REDEMPTION',
            description,
            reference,
            balance: 0,
          },
        });

        // Update user rewards
        const updatedRewards = await tx.userRewards.update({
          where: { userId },
          data: {
            totalPoints: { decrement: amount },
            availablePoints: { decrement: amount },
          },
        });

        // Update transaction balance
        await tx.pointTransaction.update({
          where: { id: transaction.id },
          data: { balance: updatedRewards.totalPoints },
        });

        return { transaction, rewards: updatedRewards };
      });
    } catch (error) {
      logger.error('Error deducting points', {
        userId,
        amount,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Expire old points
   */
  async expirePoints(): Promise<number> {
    try {
      const now = new Date();

      // Find expired transactions
      const expiredTransactions = await prisma.pointTransaction.findMany({
        where: {
          type: PointTransactionType.EARNED,
          expiresAt: { lte: now },
        },
      });

      let totalExpired = 0;

      for (const transaction of expiredTransactions) {
        await this.deductPoints(
          transaction.userId,
          transaction.amount,
          `Expiration de points du ${transaction.createdAt.toLocaleDateString()}`,
          transaction.id
        );
        totalExpired += transaction.amount;
      }

      logger.info('Points expired', {
        count: expiredTransactions.length,
        totalExpired,
      });

      return totalExpired;
    } catch (error) {
      logger.error('Error expiring points', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Calculate user tier based on lifetime points
   */
  calculateTier(lifetimePoints: number): RewardTier {
    if (lifetimePoints >= 10000) return RewardTier.PLATINUM;
    if (lifetimePoints >= 5000) return RewardTier.GOLD;
    if (lifetimePoints >= 1000) return RewardTier.SILVER;
    return RewardTier.BRONZE;
  }

  /**
   * Update user tier
   */
  async updateUserTier(userId: string) {
    try {
      const rewards = await this.getUserRewards(userId);
      if (!rewards) return null;

      const newTier = this.calculateTier(rewards.lifetimePoints);

      if (newTier !== rewards.currentTier) {
        return await prisma.userRewards.update({
          where: { userId },
          data: { currentTier: newTier },
        });
      }

      return rewards;
    } catch (error) {
      logger.error('Error updating user tier', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new RewardRepository();
