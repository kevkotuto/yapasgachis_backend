import { Request, Response, NextFunction } from 'express';
import subscriptionService from '@/core/services/subscription.service';
import promoCodeService from '@/core/services/promo-code.service';
import { AppError } from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Subscription Controller
 * Handles subscription plans and supplier subscriptions
 */
export class SubscriptionController {
  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Get public subscription plans
   * GET /api/v1/subscriptions/plans
   */
  async getPublicPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await subscriptionService.getPublicPlans();

      res.json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate a promo code
   * POST /api/v1/subscriptions/promo-codes/validate
   */
  async validatePromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, planId } = req.body;
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const result = await promoCodeService.validatePromoCode(code, supplierId, planId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== SUPPLIER ENDPOINTS ====================

  /**
   * Subscribe to a plan
   * POST /api/v1/subscriptions/subscribe
   */
  async subscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const { planId, paymentMethod, billingPeriod, promoCode } = req.body;

      const result = await subscriptionService.subscribeSupplier(supplierId, {
        planId,
        paymentMethod,
        billingPeriod,
        promoCode,
      });

      res.status(201).json({
        success: true,
        message: 'Abonnement créé avec succès',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel subscription
   * POST /api/v1/subscriptions/cancel
   */
  async cancelSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const supplier = await subscriptionService.cancelSubscription(supplierId);

      res.json({
        success: true,
        message: 'Abonnement annulé. Il restera actif jusqu\'à la fin de la période.',
        data: {
          subscriptionEndDate: supplier.subscriptionEndDate,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Renew subscription
   * POST /api/v1/subscriptions/renew
   */
  async renewSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const { billingPeriod } = req.body;

      const supplier = await subscriptionService.renewSubscription(
        supplierId,
        billingPeriod
      );

      res.json({
        success: true,
        message: 'Abonnement renouvelé avec succès',
        data: {
          subscriptionEndDate: supplier.subscriptionEndDate,
          subscriptionTier: supplier.subscriptionTier,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get subscription limits/status
   * GET /api/v1/subscriptions/limits
   */
  async getSubscriptionLimits(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const limits = await subscriptionService.checkSupplierLimits(supplierId);

      res.json({
        success: true,
        data: limits,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available promo codes for supplier
   * GET /api/v1/subscriptions/promo-codes/available
   */
  async getAvailablePromoCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const codes = await promoCodeService.getAvailableCodesForSupplier(supplierId);

      res.json({
        success: true,
        data: codes,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all subscription plans (admin)
   * GET /api/v1/admin/subscriptions/plans
   */
  async getAllPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive, isPublic } = req.query;

      const plans = await subscriptionService.getAllPlans({
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
      });

      res.json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create subscription plan (admin)
   * POST /api/v1/admin/subscriptions/plans
   */
  async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const plan = await subscriptionService.createPlan(adminId, req.body);

      res.status(201).json({
        success: true,
        message: 'Plan créé avec succès',
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update subscription plan (admin)
   * PUT /api/v1/admin/subscriptions/plans/:planId
   */
  async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const { planId } = req.params;

      const plan = await subscriptionService.updatePlan(adminId, planId, req.body);

      res.json({
        success: true,
        message: 'Plan mis à jour avec succès',
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete subscription plan (admin)
   * DELETE /api/v1/admin/subscriptions/plans/:planId
   */
  async deletePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const { planId } = req.params;

      await subscriptionService.deletePlan(adminId, planId);

      res.json({
        success: true,
        message: 'Plan supprimé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all promo codes (admin)
   * GET /api/v1/admin/subscriptions/promo-codes
   */
  async getAllPromoCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, status, type, reservedForSupplierId, page, limit } = req.query;

      const result = await promoCodeService.getAllPromoCodes({
        search: search as string,
        status: status as any,
        type: type as any,
        reservedForSupplierId: reservedForSupplierId as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: result.promoCodes,
        pagination: {
          total: result.total,
          pages: result.pages,
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 20,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create promo code (admin)
   * POST /api/v1/admin/subscriptions/promo-codes
   */
  async createPromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const promoCode = await promoCodeService.createPromoCode(adminId, {
        ...req.body,
        validFrom: req.body.validFrom ? new Date(req.body.validFrom) : undefined,
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Code promo créé avec succès',
        data: promoCode,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update promo code (admin)
   * PUT /api/v1/admin/subscriptions/promo-codes/:promoCodeId
   */
  async updatePromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const { promoCodeId } = req.params;

      const promoCode = await promoCodeService.updatePromoCode(adminId, promoCodeId, {
        ...req.body,
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : undefined,
      });

      res.json({
        success: true,
        message: 'Code promo mis à jour avec succès',
        data: promoCode,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable promo code (admin)
   * POST /api/v1/admin/subscriptions/promo-codes/:promoCodeId/disable
   */
  async disablePromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const { promoCodeId } = req.params;

      const promoCode = await promoCodeService.disablePromoCode(adminId, promoCodeId);

      res.json({
        success: true,
        message: 'Code promo désactivé avec succès',
        data: promoCode,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete promo code (admin)
   * DELETE /api/v1/admin/subscriptions/promo-codes/:promoCodeId
   */
  async deletePromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const { promoCodeId } = req.params;

      await promoCodeService.deletePromoCode(adminId, promoCodeId);

      res.json({
        success: true,
        message: 'Code promo supprimé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create bulk promo codes (admin)
   * POST /api/v1/admin/subscriptions/promo-codes/bulk
   */
  async createBulkPromoCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const codes = await promoCodeService.createBulkPromoCodes(adminId, {
        ...req.body,
        validUntil: req.body.validUntil ? new Date(req.body.validUntil) : undefined,
      });

      res.status(201).json({
        success: true,
        message: `${codes.length} codes promo créés avec succès`,
        data: codes,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SubscriptionController();
