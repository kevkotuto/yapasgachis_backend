import referralRepository from '@/core/repositories/referral.repository';
import rewardService from '@/core/services/reward.service';
import config from '@/config';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/utils/helpers';

/**
 * Referral Service
 * Business logic for referral system
 */
export class ReferralService {
  private readonly REFERRAL_REWARD_POINTS = 200; // Points for successful referral
  private readonly REFEREE_BONUS_POINTS = 100; // Bonus for referred user
  private readonly CODE_LENGTH = 8;

  /**
   * Generate unique referral code
   */
  private async generateUniqueCode(userId: string): Promise<string> {
    // Try to create code from user's name first
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    let baseCode = '';
    if (user?.firstName) {
      baseCode = user.firstName.substring(0, 4).toUpperCase();
    }

    // Add random characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = baseCode;

    for (let i = code.length; i < this.CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if exists, regenerate if needed
    const exists = await referralRepository.codeExists(code);
    if (exists) {
      // Generate fully random code
      code = '';
      for (let i = 0; i < this.CODE_LENGTH; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    return code;
  }

  /**
   * Create referral code
   */
  async createReferralCode(
    userId: string,
    customCode?: string,
    maxUses?: number,
    expiresAt?: Date
  ) {
    let code: string;

    if (customCode) {
      // Validate custom code
      if (customCode.length < 4 || customCode.length > 20) {
        throw new AppError(
          400,
          'Le code doit contenir entre 4 et 20 caractères'
        );
      }

      // Check if already exists
      const exists = await referralRepository.codeExists(customCode);
      if (exists) {
        throw new AppError(400, 'Ce code existe déjà');
      }

      code = customCode.toUpperCase();
    } else {
      code = await this.generateUniqueCode(userId);
    }

    const referralCode = await referralRepository.createCode({
      userId,
      code,
      maxUses,
      expiresAt,
    });

    const shareLink = `${config.app.frontendUrl}/invite/${code}`;

    logger.info('Referral code created', {
      userId,
      code,
    });

    return {
      ...referralCode,
      shareLink,
    };
  }

  /**
   * Get user's referral codes
   */
  async getUserReferralCodes(userId: string) {
    const codes = await referralRepository.findUserCodes(userId);

    return codes.map((code) => ({
      ...code,
      shareLink: `${config.app.frontendUrl}/invite/${code.code}`,
    }));
  }

  /**
   * Use referral code
   */
  async useReferralCode(code: string, newUserId: string) {
    const referralCode = await referralRepository.findByCode(code);

    if (!referralCode) {
      throw new AppError(404, 'Code de parrainage invalide');
    }

    // Validate code
    if (!referralCode.isActive) {
      throw new AppError(400, 'Ce code est désactivé');
    }

    if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
      throw new AppError(400, 'Ce code a expiré');
    }

    if (
      referralCode.maxUses &&
      referralCode.timesUsed >= referralCode.maxUses
    ) {
      throw new AppError(400, "Ce code a atteint sa limite d'utilisation");
    }

    if (referralCode.userId === newUserId) {
      throw new AppError(400, 'Vous ne pouvez pas utiliser votre propre code');
    }

    // Check if user already used a referral code
    const existingReferral =
      await referralRepository.findByReferredUser(newUserId);
    if (existingReferral) {
      throw new AppError(400, 'Vous avez déjà utilisé un code de parrainage');
    }

    // Create referral
    const referral = await referralRepository.createReferral({
      referralCodeId: referralCode.id,
      referrerId: referralCode.userId,
      referredUserId: newUserId,
    });

    // Increment code usage
    await referralRepository.incrementUsage(referralCode.id);

    // Award bonus points to new user
    await rewardService.awardPoints(
      newUserId,
      this.REFEREE_BONUS_POINTS,
      'REFERRAL',
      'Bonus de parrainage',
      referral.id
    );

    logger.info('Referral code used', {
      code,
      referrerId: referralCode.userId,
      referredUserId: newUserId,
    });

    return referral;
  }

  /**
   * Complete referral (called after first purchase)
   */
  async completeReferral(userId: string) {
    const referral = await referralRepository.findByReferredUser(userId);

    if (!referral) {
      return null;
    }

    if (referral.status !== 'PENDING') {
      return referral;
    }

    // Update status to completed
    const updated = await referralRepository.updateReferralStatus(
      referral.id,
      'COMPLETED'
    );

    logger.info('Referral completed', {
      referralId: referral.id,
      referrerId: referral.referrerId,
      referredUserId: userId,
    });

    return updated;
  }

  /**
   * Award referral reward
   */
  async awardReferralReward(userId: string) {
    const referral = await referralRepository.findByReferredUser(userId);

    if (!referral) {
      return null;
    }

    if (referral.status !== 'COMPLETED') {
      return null;
    }

    // Award points to referrer
    await rewardService.awardPoints(
      referral.referrerId,
      this.REFERRAL_REWARD_POINTS,
      'REFERRAL',
      'Parrainage réussi',
      referral.id
    );

    // Update referral status
    const updated = await referralRepository.updateReferralStatus(
      referral.id,
      'REWARDED',
      this.REFERRAL_REWARD_POINTS
    );

    logger.info('Referral reward awarded', {
      referralId: referral.id,
      referrerId: referral.referrerId,
      points: this.REFERRAL_REWARD_POINTS,
    });

    return updated;
  }

  /**
   * Get referral stats
   */
  async getReferralStats(userId: string) {
    const stats = await referralRepository.getUserReferralStats(userId);
    const codes = await this.getUserReferralCodes(userId);

    return {
      ...stats,
      referralCodes: codes,
    };
  }

  /**
   * Get referral history
   */
  async getReferralHistory(
    userId: string,
    page = 1,
    limit = 20,
    status?: string
  ) {
    const result = await referralRepository.getUserReferrals(
      userId,
      page,
      limit,
      status
    );

    return {
      referrals: result.referrals.map((r: any) => ({
        id: r.id,
        referralCode: r.referralCode.code,
        referredUser: r.referredUser,
        status: r.status,
        rewardEarned: r.rewardEarned,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
      })),
      total: result.total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Update referral code
   */
  async updateReferralCode(
    userId: string,
    codeId: string,
    data: {
      isActive?: boolean;
      maxUses?: number;
      expiresAt?: Date;
    }
  ) {
    const code = await referralRepository.findByCode(codeId);

    if (!code) {
      throw new AppError(404, 'Code non trouvé');
    }

    if (code.userId !== userId) {
      throw new AppError(403, "Vous n'êtes pas autorisé à modifier ce code");
    }

    const updated = await referralRepository.updateCode(code.id, data);

    logger.info('Referral code updated', {
      userId,
      codeId,
    });

    return {
      ...updated,
      shareLink: `${config.app.frontendUrl}/invite/${updated.code}`,
    };
  }

  /**
   * Delete referral code
   */
  async deleteReferralCode(userId: string, codeId: string) {
    const code = await referralRepository.findByCode(codeId);

    if (!code) {
      throw new AppError(404, 'Code non trouvé');
    }

    if (code.userId !== userId) {
      throw new AppError(403, "Vous n'êtes pas autorisé à supprimer ce code");
    }

    // Check if code has been used
    if (code.timesUsed > 0) {
      throw new AppError(
        400,
        'Impossible de supprimer un code qui a été utilisé'
      );
    }

    await referralRepository.deleteCode(code.id);

    logger.info('Referral code deleted', {
      userId,
      codeId,
    });

    return { success: true };
  }

  /**
   * Validate referral code
   */
  async validateReferralCode(code: string) {
    const referralCode: any = await referralRepository.findByCode(code);

    if (!referralCode) {
      return { valid: false, reason: 'Code invalide' };
    }

    if (!referralCode.isActive) {
      return { valid: false, reason: 'Code désactivé' };
    }

    if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
      return { valid: false, reason: 'Code expiré' };
    }

    if (
      referralCode.maxUses &&
      referralCode.timesUsed >= referralCode.maxUses
    ) {
      return { valid: false, reason: "Limite d'utilisation atteinte" };
    }

    return {
      valid: true,
      referrer: referralCode.user,
    };
  }
}

// Import prisma for the user query
import { prisma } from '@/infrastructure/database/prisma';

export default new ReferralService();
