import {
  SubscriptionPlan,
  SupplierProfile,
  SubscriptionTier,
  PromoCode,
  PromoCodeType,
} from '@prisma/client';

import promoCodeRepository, {
  PromoCodeRepository,
} from '@/core/repositories/promo-code.repository';
import subscriptionPlanRepository, {
  SubscriptionPlanRepository,
} from '@/core/repositories/subscription-plan.repository';
import supplierRepository, {
  SupplierRepository,
} from '@/core/repositories/supplier.repository';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Subscription Service
 * Business logic for supplier subscriptions
 */
export class SubscriptionService {
  constructor(
    private planRepo: SubscriptionPlanRepository,
    private promoCodeRepo: PromoCodeRepository,
    private supplierRepo: SupplierRepository
  ) {}

  // ==================== ADMIN PLAN MANAGEMENT ====================

  /**
   * Create a subscription plan (admin only)
   */
  async createPlan(
    adminId: string,
    data: {
      name: string;
      tier: SubscriptionTier;
      description?: string;
      monthlyPrice: number;
      yearlyPrice?: number;
      maxStores?: number;
      maxProducts?: number;
      maxDeals?: number;
      canCreateDeals?: boolean;
      priorityListing?: boolean;
      analyticsAccess?: boolean;
      commissionRate?: number;
      trialDays?: number;
      isPublic?: boolean;
    }
  ): Promise<SubscriptionPlan> {
    try {
      // Check if tier already exists
      const existingPlan = await this.planRepo.findByTier(data.tier);
      if (existingPlan) {
        throw new AppError(
          409,
          `Un plan avec le tier ${data.tier} existe déjà`,
          'PLAN_TIER_EXISTS'
        );
      }

      const plan = await this.planRepo.create({
        name: data.name,
        tier: data.tier,
        description: data.description,
        monthlyPrice: data.monthlyPrice,
        yearlyPrice: data.yearlyPrice,
        maxStores: data.maxStores || 1,
        maxProducts: data.maxProducts || 10,
        maxDeals: data.maxDeals || 0,
        canCreateDeals: data.canCreateDeals || false,
        priorityListing: data.priorityListing || false,
        analyticsAccess: data.analyticsAccess || false,
        commissionRate: data.commissionRate || 0.1,
        trialDays: data.trialDays || 0,
        isPublic: data.isPublic !== false,
      });

      logger.info('Subscription plan created', {
        adminId,
        planId: plan.id,
        tier: plan.tier,
      });

      return plan;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating subscription plan', {
        adminId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la création du plan');
    }
  }

  /**
   * Update subscription plan (admin only)
   */
  async updatePlan(
    adminId: string,
    planId: string,
    data: {
      name?: string;
      description?: string;
      monthlyPrice?: number;
      yearlyPrice?: number;
      maxStores?: number;
      maxProducts?: number;
      maxDeals?: number;
      canCreateDeals?: boolean;
      priorityListing?: boolean;
      analyticsAccess?: boolean;
      commissionRate?: number;
      trialDays?: number;
      isActive?: boolean;
      isPublic?: boolean;
    }
  ): Promise<SubscriptionPlan> {
    try {
      const plan = await this.planRepo.findById(planId);
      if (!plan) {
        throw new AppError(404, 'Plan non trouvé', 'PLAN_NOT_FOUND');
      }

      const updated = await this.planRepo.update(planId, data);

      logger.info('Subscription plan updated', {
        adminId,
        planId,
        changes: Object.keys(data),
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating subscription plan', {
        adminId,
        planId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la mise à jour du plan');
    }
  }

  /**
   * Delete subscription plan (admin only)
   */
  async deletePlan(adminId: string, planId: string): Promise<void> {
    try {
      const plan = await this.planRepo.findById(planId);
      if (!plan) {
        throw new AppError(404, 'Plan non trouvé', 'PLAN_NOT_FOUND');
      }

      // Check if any suppliers are using this plan
      const supplierCount = await this.planRepo.countSuppliers(planId);
      if (supplierCount > 0) {
        throw new AppError(
          409,
          `Ce plan est utilisé par ${supplierCount} fournisseur(s). Désactivez-le plutôt.`,
          'PLAN_IN_USE'
        );
      }

      await this.planRepo.delete(planId);

      logger.info('Subscription plan deleted', {
        adminId,
        planId,
        tier: plan.tier,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting subscription plan', {
        adminId,
        planId,
        error: (error as Error).message,
      });
      throw new AppError(500, 'Erreur lors de la suppression du plan');
    }
  }

  /**
   * Get all subscription plans
   */
  async getAllPlans(params?: {
    isActive?: boolean;
    isPublic?: boolean;
  }): Promise<SubscriptionPlan[]> {
    return this.planRepo.findAll(params);
  }

  /**
   * Get public plans for registration
   */
  async getPublicPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepo.findPublicPlans();
  }

  /**
   * Get plan by ID
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findById(planId);
    if (!plan) {
      throw new AppError(404, 'Plan non trouvé', 'PLAN_NOT_FOUND');
    }
    return plan;
  }

  /**
   * Get plan by tier
   */
  async getPlanByTier(tier: SubscriptionTier): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findByTier(tier);
    if (!plan) {
      throw new AppError(404, 'Plan non trouvé pour ce tier', 'PLAN_NOT_FOUND');
    }
    return plan;
  }

  // ==================== SUPPLIER SUBSCRIPTION ====================

  /**
   * Subscribe a supplier to a plan
   */
  async subscribeSupplier(
    supplierId: string,
    data: {
      planId: string;
      paymentMethod: string;
      billingPeriod: 'monthly' | 'yearly';
      promoCode?: string;
    }
  ): Promise<{
    supplier: SupplierProfile;
    subscriptionPayment: any;
    discount?: {
      type: string;
      value: number;
      savedAmount: number;
    };
  }> {
    try {
      const supplier = await this.supplierRepo.findById(supplierId);
      if (!supplier) {
        throw new AppError(404, 'Fournisseur non trouvé', 'SUPPLIER_NOT_FOUND');
      }

      const plan = await this.planRepo.findById(data.planId);
      if (!plan) {
        throw new AppError(404, 'Plan non trouvé', 'PLAN_NOT_FOUND');
      }

      if (!plan.isActive) {
        throw new AppError(
          400,
          "Ce plan n'est plus disponible",
          'PLAN_INACTIVE'
        );
      }

      // Calculate price
      let price =
        data.billingPeriod === 'yearly' && plan.yearlyPrice
          ? plan.yearlyPrice
          : plan.monthlyPrice * (data.billingPeriod === 'yearly' ? 12 : 1);

      let discount:
        | { type: string; value: number; savedAmount: number }
        | undefined;
      let promoCodeUsed: PromoCode | null = null;

      // Apply promo code if provided
      if (data.promoCode) {
        const promoResult = await this.validateAndApplyPromoCode(
          data.promoCode,
          supplierId,
          plan.id,
          price
        );
        price = promoResult.finalPrice;
        discount = promoResult.discount;
        promoCodeUsed = promoResult.promoCode;
      }

      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();

      if (plan.trialDays > 0 && !supplier.subscriptionStartDate) {
        // First subscription with trial
        endDate.setDate(endDate.getDate() + plan.trialDays);
      } else {
        // Regular subscription
        if (data.billingPeriod === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }
      }

      // Create transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create subscription payment
        const payment = await tx.subscriptionPayment.create({
          data: {
            supplierId,
            tier: plan.tier,
            amount: price,
            paymentMethod: data.paymentMethod,
            periodStart: startDate,
            periodEnd: endDate,
            status: 'PENDING',
          },
        });

        // Update supplier subscription
        const updatedSupplier = await tx.supplierProfile.update({
          where: { id: supplierId },
          data: {
            subscriptionTier: plan.tier,
            subscriptionPlanId: plan.id,
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
            subscriptionActive: price === 0 || plan.trialDays > 0, // Active if free trial
            commissionRate: plan.commissionRate,
            usedPromoCodeId: promoCodeUsed?.id,
          },
        });

        // Record promo code usage if applicable
        if (promoCodeUsed && discount) {
          await this.promoCodeRepo.recordUsage({
            promoCodeId: promoCodeUsed.id,
            supplierId,
            discountAmount: discount.savedAmount,
            appliedTo: 'SUBSCRIPTION',
            subscriptionPaymentId: payment.id,
          });
          await this.promoCodeRepo.incrementUsage(promoCodeUsed.id);
        }

        return { supplier: updatedSupplier, payment };
      });

      logger.info('Supplier subscribed to plan', {
        supplierId,
        planId: plan.id,
        tier: plan.tier,
        price,
        discount: discount?.savedAmount,
      });

      return {
        supplier: result.supplier,
        subscriptionPayment: result.payment,
        discount,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error subscribing supplier', {
        supplierId,
        error: (error as Error).message,
      });
      throw new AppError(500, "Erreur lors de l'inscription à l'abonnement");
    }
  }

  /**
   * Validate and apply promo code
   */
  private async validateAndApplyPromoCode(
    code: string,
    supplierId: string,
    planId: string,
    originalPrice: number
  ): Promise<{
    finalPrice: number;
    discount: { type: string; value: number; savedAmount: number };
    promoCode: PromoCode;
  }> {
    const promoCode = await this.promoCodeRepo.findByCode(code);

    if (!promoCode) {
      throw new AppError(404, 'Code promo invalide', 'PROMO_CODE_INVALID');
    }

    // Check if code is active
    if (promoCode.status !== 'ACTIVE') {
      throw new AppError(
        400,
        "Ce code promo n'est plus actif",
        'PROMO_CODE_INACTIVE'
      );
    }

    // Check validity dates
    const now = new Date();
    if (promoCode.validFrom > now) {
      throw new AppError(
        400,
        "Ce code promo n'est pas encore valide",
        'PROMO_CODE_NOT_STARTED'
      );
    }
    if (promoCode.validUntil && promoCode.validUntil < now) {
      throw new AppError(400, 'Ce code promo a expiré', 'PROMO_CODE_EXPIRED');
    }

    // Check max uses
    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      throw new AppError(
        400,
        "Ce code promo a atteint sa limite d'utilisation",
        'PROMO_CODE_MAX_USES'
      );
    }

    // Check if reserved for specific supplier
    if (
      promoCode.reservedForSupplierId &&
      promoCode.reservedForSupplierId !== supplierId
    ) {
      throw new AppError(
        400,
        "Ce code promo n'est pas valide pour votre compte",
        'PROMO_CODE_RESERVED'
      );
    }

    // Check if applicable to this plan
    if (promoCode.applicablePlanId && promoCode.applicablePlanId !== planId) {
      throw new AppError(
        400,
        "Ce code promo n'est pas applicable à ce plan",
        'PROMO_CODE_WRONG_PLAN'
      );
    }

    // Check user usage limit
    const userUsageCount = await this.promoCodeRepo.getUsageCountBySupplierId(
      promoCode.id,
      supplierId
    );
    if (userUsageCount >= promoCode.maxUsesPerUser) {
      throw new AppError(
        400,
        'Vous avez déjà utilisé ce code promo',
        'PROMO_CODE_USER_LIMIT'
      );
    }

    // Calculate discount
    let finalPrice = originalPrice;
    let savedAmount = 0;

    switch (promoCode.type) {
      case 'PERCENTAGE':
        savedAmount = originalPrice * (promoCode.value / 100);
        finalPrice = originalPrice - savedAmount;
        break;
      case 'FIXED_AMOUNT':
        savedAmount = Math.min(promoCode.value, originalPrice);
        finalPrice = originalPrice - savedAmount;
        break;
      case 'FREE_MONTHS':
        // Value represents free months - for monthly billing, this is direct discount
        // For yearly, we calculate proportionally
        savedAmount = (originalPrice / 12) * promoCode.value;
        finalPrice = originalPrice - savedAmount;
        break;
    }

    finalPrice = Math.max(0, finalPrice);

    return {
      finalPrice,
      discount: {
        type: promoCode.type,
        value: promoCode.value,
        savedAmount,
      },
      promoCode,
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(supplierId: string): Promise<SupplierProfile> {
    try {
      const supplier = await this.supplierRepo.findById(supplierId);
      if (!supplier) {
        throw new AppError(404, 'Fournisseur non trouvé', 'SUPPLIER_NOT_FOUND');
      }

      // Don't immediately cancel - let it run until end date
      const updated = await this.supplierRepo.update(supplierId, {
        subscriptionActive: false,
      });

      logger.info('Supplier subscription cancelled', {
        supplierId,
        endDate: supplier.subscriptionEndDate,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error cancelling subscription', {
        supplierId,
        error: (error as Error).message,
      });
      throw new AppError(500, "Erreur lors de l'annulation de l'abonnement");
    }
  }

  /**
   * Renew subscription
   */
  async renewSubscription(
    supplierId: string,
    billingPeriod: 'monthly' | 'yearly' = 'monthly'
  ): Promise<SupplierProfile> {
    try {
      const supplier = await this.supplierRepo.findById(supplierId);
      if (!supplier) {
        throw new AppError(404, 'Fournisseur non trouvé', 'SUPPLIER_NOT_FOUND');
      }

      if (!supplier.subscriptionPlanId) {
        throw new AppError(
          400,
          'Aucun abonnement à renouveler',
          'NO_SUBSCRIPTION'
        );
      }

      const plan = await this.planRepo.findById(supplier.subscriptionPlanId);
      if (!plan) {
        throw new AppError(404, 'Plan non trouvé', 'PLAN_NOT_FOUND');
      }

      // Calculate new dates
      const startDate = supplier.subscriptionEndDate || new Date();
      const endDate = new Date(startDate);

      if (billingPeriod === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      const updated = await this.supplierRepo.update(supplierId, {
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        subscriptionActive: true,
      });

      logger.info('Supplier subscription renewed', {
        supplierId,
        newEndDate: endDate,
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error renewing subscription', {
        supplierId,
        error: (error as Error).message,
      });
      throw new AppError(500, "Erreur lors du renouvellement de l'abonnement");
    }
  }

  /**
   * Check supplier limits based on subscription
   */
  async checkSupplierLimits(supplierId: string): Promise<{
    canAddStore: boolean;
    canAddProduct: boolean;
    canCreateDeal: boolean;
    currentStores: number;
    maxStores: number;
    currentProducts: number;
    maxProducts: number;
    currentDeals: number;
    maxDeals: number;
  }> {
    const supplier = await this.supplierRepo.findById(supplierId);
    if (!supplier) {
      throw new AppError(404, 'Fournisseur non trouvé', 'SUPPLIER_NOT_FOUND');
    }

    let plan: SubscriptionPlan | null = null;
    if (supplier.subscriptionPlanId) {
      plan = await this.planRepo.findById(supplier.subscriptionPlanId);
    }

    // Default limits for no plan
    const maxStores = plan?.maxStores || 1;
    const maxProducts = plan?.maxProducts || 5;
    const maxDeals = plan?.maxDeals || 0;
    const canCreateDeals = plan?.canCreateDeals || false;

    // Get current counts
    const [storeCount, productCount, dealCount] = await Promise.all([
      prisma.supplierStore.count({ where: { supplierId } }),
      prisma.product.count({ where: { supplierId } }),
      prisma.deal.count({ where: { supplierId } }),
    ]);

    return {
      canAddStore: storeCount < maxStores,
      canAddProduct: productCount < maxProducts,
      canCreateDeal: canCreateDeals && (maxDeals === 0 || dealCount < maxDeals),
      currentStores: storeCount,
      maxStores,
      currentProducts: productCount,
      maxProducts,
      currentDeals: dealCount,
      maxDeals,
    };
  }

  /**
   * Update expired subscriptions (cron job)
   */
  async updateExpiredSubscriptions(): Promise<number> {
    try {
      const result = await prisma.supplierProfile.updateMany({
        where: {
          subscriptionActive: true,
          subscriptionEndDate: { lt: new Date() },
        },
        data: {
          subscriptionActive: false,
        },
      });

      logger.info('Expired subscriptions updated', { count: result.count });
      return result.count;
    } catch (error) {
      logger.error('Error updating expired subscriptions', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new SubscriptionService(
  subscriptionPlanRepository,
  promoCodeRepository,
  supplierRepository
);
