import { Request, Response } from 'express';

import {
  CreateReferralCodeInput,
  UseReferralCodeInput,
  UpdateReferralCodeInput,
} from '../validators/referral.validator';

import referralService from '@/core/services/referral.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

/**
 * Referral Controller
 * Handles referral-related HTTP requests
 */
export class ReferralController {
  /**
   * Create a referral code
   * POST /api/v1/referrals/code
   */
  createCode = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const body = req.body as CreateReferralCodeInput;

    const code = await referralService.createReferralCode(
      userId,
      body.customCode,
      body.maxUses,
      body.expiresAt
    );

    logger.info('Referral code created via API', {
      userId,
      code: code.code,
    });

    res.status(201).json({
      success: true,
      message: 'Code de parrainage créé',
      data: { code },
    });
  });

  /**
   * Get my referral codes
   * GET /api/v1/referrals/my-codes
   */
  getMyCodes = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;

    const codes = await referralService.getUserReferralCodes(userId);

    res.json({
      success: true,
      data: { codes },
    });
  });

  /**
   * Use a referral code
   * POST /api/v1/referrals/use
   */
  useCode = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const body = req.body as UseReferralCodeInput;

    const referral = await referralService.useReferralCode(body.code, userId);

    logger.info('Referral code used via API', {
      userId,
      code: body.code,
    });

    res.json({
      success: true,
      message: 'Code de parrainage appliqué avec succès',
      data: { referral },
    });
  });

  /**
   * Validate a referral code
   * GET /api/v1/referrals/validate/:code
   */
  validateCode = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;

    const result = await referralService.validateReferralCode(code);

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get referral stats
   * GET /api/v1/referrals/stats
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;

    const stats = await referralService.getReferralStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Get referral history
   * GET /api/v1/referrals/history
   */
  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { page, limit, status } = req.query as {
      page?: string;
      limit?: string;
      status?: string;
    };

    const result = await referralService.getReferralHistory(
      userId,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
      status
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Update referral code
   * PATCH /api/v1/referrals/code/:codeId
   */
  updateCode = asyncHandler(
    async (
      req: Request<{ codeId: string }, {}, UpdateReferralCodeInput>,
      res: Response
    ) => {
      const userId = req.user.id;
      const { codeId } = req.params;

      const code = await referralService.updateReferralCode(
        userId,
        codeId,
        req.body
      );

      logger.info('Referral code updated via API', {
        userId,
        codeId,
      });

      res.json({
        success: true,
        message: 'Code mis à jour avec succès',
        data: { code },
      });
    }
  );

  /**
   * Delete referral code
   * DELETE /api/v1/referrals/code/:codeId
   */
  deleteCode = asyncHandler(
    async (req: Request<{ codeId: string }>, res: Response) => {
      const userId = req.user.id;
      const { codeId } = req.params;

      await referralService.deleteReferralCode(userId, codeId);

      logger.info('Referral code deleted via API', {
        userId,
        codeId,
      });

      res.json({
        success: true,
        message: 'Code supprimé avec succès',
      });
    }
  );

  /**
   * Complete referral (internal - called after first purchase)
   * POST /api/v1/referrals/complete/:userId
   */
  completeReferral = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const referral = await referralService.completeReferral(userId);

    if (referral) {
      logger.info('Referral completed via API', { userId });
    }

    res.json({
      success: true,
      data: { referral },
    });
  });

  /**
   * Award referral reward (internal)
   * POST /api/v1/referrals/award/:userId
   */
  awardReward = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const referral = await referralService.awardReferralReward(userId);

    if (referral) {
      logger.info('Referral reward awarded via API', { userId });
    }

    res.json({
      success: true,
      data: { referral },
    });
  });
}

export default new ReferralController();
