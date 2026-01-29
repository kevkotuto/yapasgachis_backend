import { PointTransactionType, RewardTier } from '@prisma/client';

import rewardRepository from '@/core/repositories/reward.repository';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/utils/helpers';

/**
 * Reward Service
 * Business logic for rewards and points system
 */
export class RewardService {
  // Tier thresholds
  private readonly TIER_THRESHOLDS = {
    BRONZE: 0,
    SILVER: 1000,
    GOLD: 5000,
    PLATINUM: 10000,
  };

  // Points expiration (12 months)
  private readonly POINTS_EXPIRY_MONTHS = 12;

  /**
   * Get user's reward summary
   */
  async getUserRewards(userId: string) {
    let rewards = await rewardRepository.getUserRewards(userId);

    if (!rewards) {
      // Create initial rewards for user
      rewards = await rewardRepository.upsertUserRewards(userId, {
        totalPoints: 0,
        availablePoints: 0,
        lifetimePoints: 0,
        currentTier: RewardTier.BRONZE,
      });
    }

    // Calculate tier progress
    const nextTier = this.getNextTier(rewards.currentTier);
    const pointsToNextTier = nextTier
      ? this.TIER_THRESHOLDS[nextTier as keyof typeof this.TIER_THRESHOLDS] -
        rewards.lifetimePoints
      : 0;

    const tierProgress = nextTier
      ? Math.min(
          100,
          (rewards.lifetimePoints /
            this.TIER_THRESHOLDS[
              nextTier as keyof typeof this.TIER_THRESHOLDS
            ]) *
            100
        )
      : 100;

    return {
      ...rewards,
      nextTier,
      pointsToNextTier: Math.max(0, pointsToNextTier),
      tierProgress,
    };
  }

  /**
   * Award points to user
   */
  async awardPoints(
    userId: string,
    amount: number,
    source: string,
    description: string,
    reference?: string
  ) {
    if (amount <= 0) {
      throw new AppError(400, 'Le montant doit être positif');
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + this.POINTS_EXPIRY_MONTHS);

    const result = await rewardRepository.addPoints(
      userId,
      amount,
      source,
      description,
      reference,
      expiresAt
    );

    // Update tier if needed
    await rewardRepository.updateUserTier(userId);

    logger.info('Points awarded', {
      userId,
      amount,
      source,
      reference,
    });

    return result;
  }

  /**
   * Redeem points
   */
  async redeemPoints(
    userId: string,
    points: number,
    rewardType: 'DISCOUNT' | 'VOUCHER' | 'GIFT',
    orderId?: string
  ) {
    if (points <= 0) {
      throw new AppError(400, 'Le montant doit être positif');
    }

    const rewards = await rewardRepository.getUserRewards(userId);

    if (!rewards || rewards.availablePoints < points) {
      throw new AppError(400, 'Points insuffisants');
    }

    const description = `Utilisation de ${points} points - ${rewardType}`;

    const result = await rewardRepository.deductPoints(
      userId,
      points,
      description,
      orderId
    );

    logger.info('Points redeemed', {
      userId,
      points,
      rewardType,
      orderId,
    });

    return result;
  }

  /**
   * Get point transactions history
   */
  async getTransactionHistory(
    userId: string,
    page = 1,
    limit = 20,
    type?: PointTransactionType
  ) {
    const result = await rewardRepository.getTransactions(
      userId,
      page,
      limit,
      type
    );

    return {
      ...result,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Award points for purchase
   */
  async awardPurchasePoints(
    userId: string,
    orderAmount: number,
    orderId: string
  ) {
    // 1 point per 100 FCFA spent
    const points = Math.floor(orderAmount / 100);

    if (points > 0) {
      return await this.awardPoints(
        userId,
        points,
        'PURCHASE',
        `Achat de ${orderAmount} FCFA`,
        orderId
      );
    }

    return null;
  }

  /**
   * Award points for review
   */
  async awardReviewPoints(userId: string, reviewId: string) {
    const REVIEW_POINTS = 10;

    return await this.awardPoints(
      userId,
      REVIEW_POINTS,
      'REVIEW',
      'Avis produit',
      reviewId
    );
  }

  /**
   * Award points for donation
   */
  async awardDonationPoints(
    userId: string,
    donationAmount: number,
    donationId: string
  ) {
    // 2 points per 100 FCFA donated (double reward for donations)
    const points = Math.floor((donationAmount / 100) * 2);

    if (points > 0) {
      return await this.awardPoints(
        userId,
        points,
        'DONATION',
        `Don de ${donationAmount} FCFA`,
        donationId
      );
    }

    return null;
  }

  /**
   * Award signup bonus
   */
  async awardSignupBonus(userId: string) {
    const SIGNUP_BONUS = 100;

    return await this.awardPoints(
      userId,
      SIGNUP_BONUS,
      'SIGNUP_BONUS',
      "Bonus d'inscription"
    );
  }

  /**
   * Award daily login points
   */
  async awardDailyLoginPoints(userId: string) {
    const DAILY_POINTS = 5;

    // Check if user already got daily points today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transactions = await rewardRepository.getTransactions(
      userId,
      1,
      1,
      PointTransactionType.EARNED
    );

    if (transactions.transactions.length > 0) {
      const lastTransaction = transactions.transactions[0];
      const lastDate = new Date(lastTransaction.createdAt);
      lastDate.setHours(0, 0, 0, 0);

      if (
        lastDate.getTime() === today.getTime() &&
        lastTransaction.source === 'DAILY_LOGIN'
      ) {
        throw new AppError(400, 'Points quotidiens déjà réclamés');
      }
    }

    return await this.awardPoints(
      userId,
      DAILY_POINTS,
      'DAILY_LOGIN',
      'Connexion quotidienne'
    );
  }

  /**
   * Get tier benefits
   */
  getTierBenefits(tier: string) {
    const benefits = {
      BRONZE: {
        tier: 'BRONZE',
        minPoints: 0,
        benefits: [
          'Gagner des points sur chaque achat',
          'Accès aux offres spéciales',
        ],
        discountPercentage: 0,
        prioritySupport: false,
      },
      SILVER: {
        tier: 'SILVER',
        minPoints: 1000,
        benefits: [
          'Tous les avantages Bronze',
          '5% de réduction sur les achats',
          'Livraison gratuite dès 5000 FCFA',
        ],
        discountPercentage: 5,
        freeDeliveryThreshold: 5000,
        prioritySupport: false,
      },
      GOLD: {
        tier: 'GOLD',
        minPoints: 5000,
        benefits: [
          'Tous les avantages Silver',
          '10% de réduction sur les achats',
          'Livraison gratuite dès 3000 FCFA',
          'Accès anticipé aux deals',
        ],
        discountPercentage: 10,
        freeDeliveryThreshold: 3000,
        prioritySupport: true,
      },
      PLATINUM: {
        tier: 'PLATINUM',
        minPoints: 10000,
        benefits: [
          'Tous les avantages Gold',
          '15% de réduction sur les achats',
          'Livraison gratuite sans minimum',
          'Support client prioritaire',
          'Cadeaux exclusifs',
        ],
        discountPercentage: 15,
        freeDeliveryThreshold: 0,
        prioritySupport: true,
      },
    };

    return benefits[tier as keyof typeof benefits] || benefits.BRONZE;
  }

  /**
   * Get next tier
   */
  private getNextTier(currentTier: string): string | null {
    const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
    const currentIndex = tiers.indexOf(currentTier);

    if (currentIndex === -1 || currentIndex === tiers.length - 1) {
      return null;
    }

    return tiers[currentIndex + 1];
  }

  /**
   * Calculate discount based on points and tier
   */
  calculatePointsDiscount(points: number, tier: string): number {
    // 1 point = 1 FCFA discount
    const baseDiscount = points;

    // Apply tier bonus
    const tierBenefits = this.getTierBenefits(tier);
    const bonus = (baseDiscount * tierBenefits.discountPercentage) / 100;

    return baseDiscount + bonus;
  }
}

export default new RewardService();
