import {
  PromoCode,
  PromoCodeUsage,
  PromoCodeStatus,
  PromoCodeType,
} from '@prisma/client';

import promoCodeRepository, {
  PromoCodeRepository,
} from '@/core/repositories/promo-code.repository';
import subscriptionPlanRepository, {
  SubscriptionPlanRepository,
} from '@/core/repositories/subscription-plan.repository';
import supplierRepository from '@/core/repositories/supplier.repository';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';
import { generateRandomCode } from '@/utils/helpers';

/**
 * Promo Code Service
 * Business logic for promo codes (admin-managed)
 */
export class PromoCodeService {
  constructor(
    private promoCodeRepo: PromoCodeRepository,
    private planRepo: SubscriptionPlanRepository
  ) {}

  // ==================== ADMIN PROMO CODE MANAGEMENT ====================

  /**
   * Create a promo code (admin only)
   */
  async createPromoCode(
    adminId: string,
    data: {
      code?: string; // If not provided, auto-generate
      description?: string;
      type: PromoCodeType;
      value: number;
      applicablePlanId?: string;
      reservedForSupplierId?: string;
      maxUses?: number;
      maxUsesPerUser?: number;
      validFrom?: Date;
      validUntil?: Date;
    }
  ): Promise<PromoCode> {
    try {
      // Generate code if not provided
      const code = data.code?.toUpperCase() || this.generatePromoCode();

      // Check if code already exists
      const existingCode = await this.promoCodeRepo.findByCode(code);
      if (existingCode) {
        throw new AppError(
          409,
          'Ce code promo existe déjà',
          'PROMO_CODE_EXISTS'
        );
      }

      // Validate plan if provided
      if (data.applicablePlanId) {
        const plan = await this.planRepo.findById(data.applicablePlanId);
        if (!plan) {
          throw new AppError(404, 'Plan non trouvé', 'PLAN_NOT_FOUND');
        }
      }

      // Validate supplier if reserved
      if (data.reservedForSupplierId) {
        const supplier = await supplierRepository.findById(
          data.reservedForSupplierId
        );
        if (!supplier) {
          throw new AppError(
            404,
            'Fournisseur non trouvé',
            'SUPPLIER_NOT_FOUND'
          );
        }
      }

      // Validate value based on type
      this.validatePromoCodeValue(data.type, data.value);

      const promoCode = await this.promoCodeRepo.create({
        code,
        description: data.description,
        type: data.type,
        value: data.value,
        ...(data.applicablePlanId && {
          applicablePlan: { connect: { id: data.applicablePlanId } },
        }),
        ...(data.reservedForSupplierId && {
          reservedForSupplier: { connect: { id: data.reservedForSupplierId } },
        }),
        maxUses: data.maxUses,
        maxUsesPerUser: data.maxUsesPerUser || 1,
        validFrom: data.validFrom || new Date(),
        validUntil: data.validUntil,
        createdByAdminId: adminId,
      });

      logger.info('Promo code created', {
        adminId,
        promoCodeId: promoCode.id,
        code: promoCode.code,
        type: promoCode.type,
        reservedFor: data.reservedForSupplierId,
      });

      return promoCode;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating promo code', {
        adminId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la création du code promo');
    }
  }

  /**
   * Update promo code (admin only)
   */
  async updatePromoCode(
    adminId: string,
    promoCodeId: string,
    data: {
      description?: string;
      maxUses?: number;
      maxUsesPerUser?: number;
      validUntil?: Date;
      status?: PromoCodeStatus;
    }
  ): Promise<PromoCode> {
    try {
      const promoCode = await this.promoCodeRepo.findById(promoCodeId);
      if (!promoCode) {
        throw new AppError(
          404,
          'Code promo non trouvé',
          'PROMO_CODE_NOT_FOUND'
        );
      }

      // Cannot modify code, type, or value after creation
      const updated = await this.promoCodeRepo.update(promoCodeId, data);

      logger.info('Promo code updated', {
        adminId,
        promoCodeId,
        changes: Object.keys(data),
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating promo code', {
        adminId,
        promoCodeId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la mise à jour du code promo');
    }
  }

  /**
   * Disable promo code (admin only)
   */
  async disablePromoCode(
    adminId: string,
    promoCodeId: string
  ): Promise<PromoCode> {
    try {
      const promoCode = await this.promoCodeRepo.findById(promoCodeId);
      if (!promoCode) {
        throw new AppError(
          404,
          'Code promo non trouvé',
          'PROMO_CODE_NOT_FOUND'
        );
      }

      const updated = await this.promoCodeRepo.update(promoCodeId, {
        status: 'DISABLED',
      });

      logger.info('Promo code disabled', {
        adminId,
        promoCodeId,
        code: promoCode.code,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error disabling promo code', {
        adminId,
        promoCodeId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la désactivation du code promo');
    }
  }

  /**
   * Delete promo code (admin only)
   */
  async deletePromoCode(adminId: string, promoCodeId: string): Promise<void> {
    try {
      const promoCode = await this.promoCodeRepo.findById(promoCodeId);
      if (!promoCode) {
        throw new AppError(
          404,
          'Code promo non trouvé',
          'PROMO_CODE_NOT_FOUND'
        );
      }

      // Don't delete if already used
      if (promoCode.currentUses > 0) {
        throw new AppError(
          409,
          'Ce code promo a déjà été utilisé. Désactivez-le plutôt.',
          'PROMO_CODE_USED'
        );
      }

      await this.promoCodeRepo.delete(promoCodeId);

      logger.info('Promo code deleted', {
        adminId,
        promoCodeId,
        code: promoCode.code,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting promo code', {
        adminId,
        promoCodeId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la suppression du code promo');
    }
  }

  /**
   * Get all promo codes (admin)
   */
  async getAllPromoCodes(params?: {
    search?: string;
    status?: PromoCodeStatus;
    type?: PromoCodeType;
    reservedForSupplierId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ promoCodes: PromoCode[]; total: number; pages: number }> {
    const { promoCodes, total } = await this.promoCodeRepo.search(params || {});
    const limit = params?.limit || 20;
    const pages = Math.ceil(total / limit);

    return { promoCodes, total, pages };
  }

  /**
   * Get promo code by ID
   */
  async getPromoCodeById(promoCodeId: string): Promise<PromoCode> {
    const promoCode = await this.promoCodeRepo.findById(promoCodeId);
    if (!promoCode) {
      throw new AppError(404, 'Code promo non trouvé', 'PROMO_CODE_NOT_FOUND');
    }
    return promoCode;
  }

  /**
   * Get promo code by code string
   */
  async getPromoCodeByCode(code: string): Promise<PromoCode> {
    const promoCode = await this.promoCodeRepo.findByCode(code);
    if (!promoCode) {
      throw new AppError(404, 'Code promo non trouvé', 'PROMO_CODE_NOT_FOUND');
    }
    return promoCode;
  }

  // ==================== SUPPLIER/USER PROMO CODE VALIDATION ====================

  /**
   * Validate a promo code (for suppliers during registration/subscription)
   */
  async validatePromoCode(
    code: string,
    supplierId: string,
    planId?: string
  ): Promise<{
    isValid: boolean;
    promoCode?: PromoCode;
    discountInfo?: {
      type: PromoCodeType;
      value: number;
      description: string;
    };
    error?: string;
  }> {
    try {
      const promoCode = await this.promoCodeRepo.findByCode(code);

      if (!promoCode) {
        return { isValid: false, error: 'Code promo invalide' };
      }

      // Check status
      if (promoCode.status !== 'ACTIVE') {
        return { isValid: false, error: "Ce code promo n'est plus actif" };
      }

      // Check validity dates
      const now = new Date();
      if (promoCode.validFrom > now) {
        return {
          isValid: false,
          error: "Ce code promo n'est pas encore valide",
        };
      }
      if (promoCode.validUntil && promoCode.validUntil < now) {
        return { isValid: false, error: 'Ce code promo a expiré' };
      }

      // Check max uses
      if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
        return {
          isValid: false,
          error: "Ce code promo a atteint sa limite d'utilisation",
        };
      }

      // Check if reserved for specific supplier
      if (
        promoCode.reservedForSupplierId &&
        promoCode.reservedForSupplierId !== supplierId
      ) {
        return {
          isValid: false,
          error: "Ce code promo n'est pas valide pour votre compte",
        };
      }

      // Check if applicable to this plan
      if (
        planId &&
        promoCode.applicablePlanId &&
        promoCode.applicablePlanId !== planId
      ) {
        return {
          isValid: false,
          error: "Ce code promo n'est pas applicable à ce plan",
        };
      }

      // Check user usage limit
      const userUsageCount = await this.promoCodeRepo.getUsageCountBySupplierId(
        promoCode.id,
        supplierId
      );
      if (userUsageCount >= promoCode.maxUsesPerUser) {
        return {
          isValid: false,
          error: 'Vous avez déjà utilisé ce code promo',
        };
      }

      // Build discount description
      let description = '';
      switch (promoCode.type) {
        case 'PERCENTAGE':
          description = `${promoCode.value}% de réduction`;
          break;
        case 'FIXED_AMOUNT':
          description = `${promoCode.value} XOF de réduction`;
          break;
        case 'FREE_MONTHS':
          description = `${promoCode.value} mois gratuit(s)`;
          break;
      }

      return {
        isValid: true,
        promoCode,
        discountInfo: {
          type: promoCode.type,
          value: promoCode.value,
          description,
        },
      };
    } catch (error) {
      logger.error('Error validating promo code', {
        code,
        supplierId,
        error: (error as Error).message,
      });
      return {
        isValid: false,
        error: 'Erreur lors de la validation du code promo',
      };
    }
  }

  /**
   * Get available promo codes for a supplier
   */
  async getAvailableCodesForSupplier(supplierId: string): Promise<PromoCode[]> {
    return this.promoCodeRepo.findForSupplier(supplierId);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generate a random promo code
   */
  private generatePromoCode(): string {
    const prefix = 'YPG'; // YaPasGachis
    const randomPart = generateRandomCode(6).toUpperCase();
    return `${prefix}${randomPart}`;
  }

  /**
   * Validate promo code value based on type
   */
  private validatePromoCodeValue(type: PromoCodeType, value: number): void {
    switch (type) {
      case 'PERCENTAGE':
        if (value <= 0 || value > 100) {
          throw new AppError(
            400,
            'Le pourcentage doit être entre 1 et 100',
            'INVALID_PERCENTAGE'
          );
        }
        break;
      case 'FIXED_AMOUNT':
        if (value <= 0) {
          throw new AppError(
            400,
            'Le montant doit être supérieur à 0',
            'INVALID_AMOUNT'
          );
        }
        break;
      case 'FREE_MONTHS':
        if (value <= 0 || value > 12 || !Number.isInteger(value)) {
          throw new AppError(
            400,
            'Le nombre de mois gratuits doit être entre 1 et 12',
            'INVALID_FREE_MONTHS'
          );
        }
        break;
    }
  }

  /**
   * Update expired promo codes (cron job)
   */
  async updateExpiredCodes(): Promise<number> {
    return this.promoCodeRepo.updateExpiredCodes();
  }

  /**
   * Get promo code statistics
   */
  async getPromoCodeStatistics(promoCodeId: string): Promise<{
    totalUses: number;
    totalDiscount: number;
    uniqueSuppliers: number;
  }> {
    const promoCode = await this.promoCodeRepo.findById(promoCodeId);
    if (!promoCode) {
      throw new AppError(404, 'Code promo non trouvé', 'PROMO_CODE_NOT_FOUND');
    }

    // Get usage statistics from usages relation
    // This would require a more complex query - simplified for now
    return {
      totalUses: promoCode.currentUses,
      totalDiscount: 0, // Would need to aggregate from usages
      uniqueSuppliers: promoCode.currentUses, // Approximate
    };
  }

  /**
   * Create bulk promo codes (admin utility)
   */
  async createBulkPromoCodes(
    adminId: string,
    data: {
      count: number;
      prefix?: string;
      type: PromoCodeType;
      value: number;
      applicablePlanId?: string;
      maxUsesPerCode?: number;
      validUntil?: Date;
    }
  ): Promise<PromoCode[]> {
    try {
      const codes: PromoCode[] = [];

      for (let i = 0; i < data.count; i++) {
        const code = await this.createPromoCode(adminId, {
          code: data.prefix
            ? `${data.prefix}${generateRandomCode(4).toUpperCase()}`
            : undefined,
          type: data.type,
          value: data.value,
          applicablePlanId: data.applicablePlanId,
          maxUses: data.maxUsesPerCode || 1,
          maxUsesPerUser: 1,
          validUntil: data.validUntil,
        });
        codes.push(code);
      }

      logger.info('Bulk promo codes created', {
        adminId,
        count: codes.length,
        type: data.type,
        value: data.value,
      });

      return codes;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating bulk promo codes', {
        adminId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        'Erreur lors de la création des codes promo en masse'
      );
    }
  }
}

export default new PromoCodeService(
  promoCodeRepository,
  subscriptionPlanRepository
);
