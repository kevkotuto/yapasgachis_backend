import { PromoCodeStatus, PromoCodeType } from '@prisma/client';
import { Request, Response } from 'express';

import promoCodeService from '@/core/services/promo-code.service';
import subscriptionService from '@/core/services/subscription.service';
import { AppError, asyncHandler } from '@/middleware/error-handler.middleware';

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
  getPublicPlans = asyncHandler(async (_req: Request, res: Response) => {
    const plans = await subscriptionService.getPublicPlans();

    res.json({
      success: true,
      data: plans,
    });
  });

  /**
   * Validate a promo code
   * POST /api/v1/subscriptions/promo-codes/validate
   */
  validatePromoCode = asyncHandler(async (req: Request, res: Response) => {
    const { code, planId } = req.body as { code: string; planId?: string };
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const result = await promoCodeService.validatePromoCode(
      code,
      supplierId,
      planId
    );

    res.json({
      success: true,
      data: result,
    });
  });

  // ==================== SUPPLIER ENDPOINTS ====================

  /**
   * Subscribe to a plan
   * POST /api/v1/subscriptions/subscribe
   */
  subscribe = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const { planId, paymentMethod, billingPeriod, promoCode } = req.body as {
      planId: string;
      paymentMethod: string;
      billingPeriod: 'monthly' | 'yearly';
      promoCode?: string;
    };

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
  });

  /**
   * Cancel subscription
   * POST /api/v1/subscriptions/cancel
   */
  cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const supplier = await subscriptionService.cancelSubscription(supplierId);

    res.json({
      success: true,
      message:
        "Abonnement annulé. Il restera actif jusqu'à la fin de la période.",
      data: {
        subscriptionEndDate: supplier.subscriptionEndDate,
      },
    });
  });

  /**
   * Renew subscription
   * POST /api/v1/subscriptions/renew
   */
  renewSubscription = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const { billingPeriod } = req.body as {
      billingPeriod: 'monthly' | 'yearly';
    };

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
  });

  /**
   * Get subscription limits/status
   * GET /api/v1/subscriptions/limits
   */
  getSubscriptionLimits = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const limits = await subscriptionService.checkSupplierLimits(supplierId);

    res.json({
      success: true,
      data: limits,
    });
  });

  /**
   * Get available promo codes for supplier
   * GET /api/v1/subscriptions/promo-codes/available
   */
  getAvailablePromoCodes = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const codes =
      await promoCodeService.getAvailableCodesForSupplier(supplierId);

    res.json({
      success: true,
      data: codes,
    });
  });

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all subscription plans (admin)
   * GET /api/v1/admin/subscriptions/plans
   */
  getAllPlans = asyncHandler(async (req: Request, res: Response) => {
    const { isActive, isPublic } = req.query;

    const plans = await subscriptionService.getAllPlans({
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isPublic:
        isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
    });

    res.json({
      success: true,
      data: plans,
    });
  });

  /**
   * Create subscription plan (admin)
   * POST /api/v1/admin/subscriptions/plans
   */
  createPlan = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const plan = await subscriptionService.createPlan(adminId, req.body);

    res.status(201).json({
      success: true,
      message: 'Plan créé avec succès',
      data: plan,
    });
  });

  /**
   * Update subscription plan (admin)
   * PUT /api/v1/admin/subscriptions/plans/:planId
   */
  updatePlan = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const { planId } = req.params;

    const plan = await subscriptionService.updatePlan(
      adminId,
      planId,
      req.body
    );

    res.json({
      success: true,
      message: 'Plan mis à jour avec succès',
      data: plan,
    });
  });

  /**
   * Delete subscription plan (admin)
   * DELETE /api/v1/admin/subscriptions/plans/:planId
   */
  deletePlan = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const { planId } = req.params;

    await subscriptionService.deletePlan(adminId, planId);

    res.json({
      success: true,
      message: 'Plan supprimé avec succès',
    });
  });

  /**
   * Get all promo codes (admin)
   * GET /api/v1/admin/subscriptions/promo-codes
   */
  getAllPromoCodes = asyncHandler(async (req: Request, res: Response) => {
    const { search, status, type, reservedForSupplierId, page, limit } =
      req.query;

    const result = await promoCodeService.getAllPromoCodes({
      search: search as string,
      status: status as PromoCodeStatus | undefined,
      type: type as PromoCodeType | undefined,
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
  });

  /**
   * Create promo code (admin)
   * POST /api/v1/admin/subscriptions/promo-codes
   */
  createPromoCode = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const body = req.body as {
      code?: string;
      description?: string;
      type: PromoCodeType;
      value: number;
      applicablePlanId?: string;
      reservedForSupplierId?: string;
      maxUses?: number;
      maxUsesPerUser?: number;
      validFrom?: string;
      validUntil?: string;
    };
    const promoCode = await promoCodeService.createPromoCode(adminId, {
      ...body,
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Code promo créé avec succès',
      data: promoCode,
    });
  });

  /**
   * Update promo code (admin)
   * PUT /api/v1/admin/subscriptions/promo-codes/:promoCodeId
   */
  updatePromoCode = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const { promoCodeId } = req.params;
    const body = req.body as {
      validUntil?: string;
      [key: string]: unknown;
    };

    const promoCode = await promoCodeService.updatePromoCode(
      adminId,
      promoCodeId,
      {
        ...body,
        validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      }
    );

    res.json({
      success: true,
      message: 'Code promo mis à jour avec succès',
      data: promoCode,
    });
  });

  /**
   * Disable promo code (admin)
   * POST /api/v1/admin/subscriptions/promo-codes/:promoCodeId/disable
   */
  disablePromoCode = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const { promoCodeId } = req.params;

    const promoCode = await promoCodeService.disablePromoCode(
      adminId,
      promoCodeId
    );

    res.json({
      success: true,
      message: 'Code promo désactivé avec succès',
      data: promoCode,
    });
  });

  /**
   * Delete promo code (admin)
   * DELETE /api/v1/admin/subscriptions/promo-codes/:promoCodeId
   */
  deletePromoCode = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const { promoCodeId } = req.params;

    await promoCodeService.deletePromoCode(adminId, promoCodeId);

    res.json({
      success: true,
      message: 'Code promo supprimé avec succès',
    });
  });

  /**
   * Create bulk promo codes (admin)
   * POST /api/v1/admin/subscriptions/promo-codes/bulk
   */
  createBulkPromoCodes = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const body = req.body as {
      count: number;
      prefix?: string;
      type: PromoCodeType;
      value: number;
      applicablePlanId?: string;
      maxUsesPerCode?: number;
      validUntil?: string;
    };
    const codes = await promoCodeService.createBulkPromoCodes(adminId, {
      ...body,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
    });

    res.status(201).json({
      success: true,
      message: `${codes.length} codes promo créés avec succès`,
      data: codes,
    });
  });
}

export default new SubscriptionController();
