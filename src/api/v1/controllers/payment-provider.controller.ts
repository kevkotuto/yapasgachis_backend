import { Request, Response } from 'express';

import paymentProviderService from '@/core/services/payment-provider.service';
import { AppError, asyncHandler } from '@/middleware/error-handler.middleware';

/**
 * Payment Provider Controller
 * Handles payment provider management (admin and public)
 */
export class PaymentProviderController {
  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Get active payment providers (for clients/suppliers)
   * GET /api/v1/payment-providers
   */
  getActiveProviders = asyncHandler(async (_req: Request, res: Response) => {
    const providers = await paymentProviderService.getActiveProviders();

    res.json({
      success: true,
      data: providers,
    });
  });

  /**
   * Get payment provider by slug (public)
   * GET /api/v1/payment-providers/:slug
   */
  getProviderBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params as { slug: string };

    const provider = await paymentProviderService.getProviderBySlug(slug);

    res.json({
      success: true,
      data: provider,
    });
  });

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Create a payment provider (admin only)
   * POST /api/v1/admin/payment-providers
   */
  createProvider = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user?.id;

    if (!adminId) {
      throw new AppError(401, 'Authentification requise', 'UNAUTHORIZED');
    }

    const provider = await paymentProviderService.createProvider(
      adminId,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'Moyen de paiement créé avec succès',
      data: provider,
    });
  });

  /**
   * Update payment provider (admin only)
   * PATCH /api/v1/admin/payment-providers/:providerId
   */
  updateProvider = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user?.id;
    const { providerId } = req.params as { providerId: string };

    if (!adminId) {
      throw new AppError(401, 'Authentification requise', 'UNAUTHORIZED');
    }

    const provider = await paymentProviderService.updateProvider(
      adminId,
      providerId,
      req.body
    );

    res.json({
      success: true,
      message: 'Moyen de paiement mis à jour avec succès',
      data: provider,
    });
  });

  /**
   * Delete payment provider (admin only)
   * DELETE /api/v1/admin/payment-providers/:providerId
   */
  deleteProvider = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user?.id;
    const { providerId } = req.params as { providerId: string };

    if (!adminId) {
      throw new AppError(401, 'Authentification requise', 'UNAUTHORIZED');
    }

    await paymentProviderService.deleteProvider(adminId, providerId);

    res.json({
      success: true,
      message: 'Moyen de paiement supprimé avec succès',
    });
  });

  /**
   * Get all payment providers (admin only - includes inactive)
   * GET /api/v1/admin/payment-providers
   */
  getAllProviders = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as any;

    const result = await paymentProviderService.getAllProviders({
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      isActive:
        query.isActive !== undefined ? query.isActive === 'true' : undefined,
      status: query.status,
      search: query.search,
    });

    res.json({
      success: true,
      data: result.providers,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * Get payment provider by ID (admin only)
   * GET /api/v1/admin/payment-providers/:providerId
   */
  getProviderById = asyncHandler(async (req: Request, res: Response) => {
    const { providerId } = req.params as { providerId: string };

    const provider = await paymentProviderService.getProviderById(providerId);

    res.json({
      success: true,
      data: provider,
    });
  });

  /**
   * Update display order of providers (admin only)
   * PATCH /api/v1/admin/payment-providers/display-order
   */
  updateDisplayOrder = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user?.id;
    const { updates } = req.body as {
      updates: { id: string; displayOrder: number }[];
    };

    if (!adminId) {
      throw new AppError(401, 'Authentification requise', 'UNAUTHORIZED');
    }

    await paymentProviderService.updateDisplayOrder(adminId, updates);

    res.json({
      success: true,
      message: "Ordre d'affichage mis à jour avec succès",
    });
  });
}

export default new PaymentProviderController();
