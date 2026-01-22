import { Request, Response } from 'express';

import { RedeemPointsInput } from '../validators/reward.validator';

import rewardService from '@/core/services/reward.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

/**
 * Reward Controller
 * Handles rewards and points-related HTTP requests
 */
export class RewardController {
  /**
   * Get user's rewards summary
   * GET /api/v1/rewards/me
   */
  getMyRewards = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;

    const rewards = await rewardService.getUserRewards(userId);

    res.json({
      success: true,
      data: { rewards },
    });
  });

  /**
   * Get point transactions history
   * GET /api/v1/rewards/transactions
   */
  getTransactions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { page, limit, type } = req.query as {
      page?: string;
      limit?: string;
      type?: string;
    };

    const result = await rewardService.getTransactionHistory(
      userId,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
      type
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Redeem points for rewards
   * POST /api/v1/rewards/redeem
   */
  redeemPoints = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const body = req.body as RedeemPointsInput;

    const result = await rewardService.redeemPoints(
      userId,
      body.points,
      body.rewardType,
      body.orderId
    );

    logger.info('Points redeemed via API', {
      userId,
      points: body.points,
      rewardType: body.rewardType,
    });

    res.json({
      success: true,
      message: 'Points utilisés avec succès',
      data: result,
    });
  });

  /**
   * Claim daily login points
   * POST /api/v1/rewards/daily-login
   */
  claimDailyPoints = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;

    const result = await rewardService.awardDailyLoginPoints(userId);

    logger.info('Daily points claimed via API', { userId });

    res.json({
      success: true,
      message: 'Points quotidiens réclamés',
      data: result,
    });
  });

  /**
   * Get tier benefits
   * GET /api/v1/rewards/tiers/:tier
   */
  getTierBenefits = asyncHandler(async (req: Request, res: Response) => {
    const { tier } = req.params;

    const benefits = rewardService.getTierBenefits(tier.toUpperCase());

    res.json({
      success: true,
      data: { benefits },
    });
  });

  /**
   * Get all tiers information
   * GET /api/v1/rewards/tiers
   */
  getAllTiers = asyncHandler(async (req: Request, res: Response) => {
    const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((tier) =>
      rewardService.getTierBenefits(tier)
    );

    res.json({
      success: true,
      data: { tiers },
    });
  });

  /**
   * Calculate points discount
   * POST /api/v1/rewards/calculate-discount
   */
  calculateDiscount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { points } = req.body as { points: number };

    const rewards = await rewardService.getUserRewards(userId);
    const discount = rewardService.calculatePointsDiscount(
      points,
      rewards.currentTier
    );

    res.json({
      success: true,
      data: {
        points,
        discount,
        tier: rewards.currentTier,
      },
    });
  });

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Award points to user (admin)
   * POST /api/v1/admin/rewards/award
   */
  adminAwardPoints = asyncHandler(async (req: Request, res: Response) => {
    const { userId, amount, source, description, reference } = req.body as {
      userId: string;
      amount: number;
      source: string;
      description: string;
      reference?: string;
    };

    const result = await rewardService.awardPoints(
      userId,
      amount,
      source,
      description,
      reference
    );

    logger.info('Points awarded by admin', {
      adminId: req.user.id,
      userId,
      amount,
      source,
    });

    res.json({
      success: true,
      message: 'Points attribués avec succès',
      data: result,
    });
  });

  /**
   * Get user rewards (admin)
   * GET /api/v1/admin/rewards/:userId
   */
  adminGetUserRewards = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const rewards = await rewardService.getUserRewards(userId);

    res.json({
      success: true,
      data: { rewards },
    });
  });
}

export default new RewardController();
