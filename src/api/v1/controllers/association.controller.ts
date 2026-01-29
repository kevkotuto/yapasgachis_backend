import { Request, Response } from 'express';

import associationService from '@/core/services/association.service';
import { AppError, asyncHandler } from '@/middleware/error-handler.middleware';
import { normalizeImages, normalizeImagesList } from '@/utils/normalize.utils';

/**
 * Association Controller
 * Handles association-related endpoints
 */
export class AssociationController {
  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Search associations
   * GET /api/v1/associations
   */
  search = asyncHandler(async (req: Request, res: Response) => {
    const {
      search,
      verified,
      acceptedFoodType,
      latitude,
      longitude,
      radius,
      page,
      limit,
    } = req.query;

    const result = await associationService.search({
      search: search as string,
      verified:
        verified === 'true' ? true : verified === 'false' ? false : undefined,
      acceptedFoodType: acceptedFoodType as string,
      latitude: latitude ? parseFloat(latitude as string) : undefined,
      longitude: longitude ? parseFloat(longitude as string) : undefined,
      radius: radius ? parseFloat(radius as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.associations,
      pagination: {
        total: result.total,
        pages: result.pages,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      },
    });
  });

  /**
   * Get all verified associations
   * GET /api/v1/associations/verified
   */
  getAllVerified = asyncHandler(async (_req: Request, res: Response) => {
    const associations = await associationService.getAllVerified();

    res.json({
      success: true,
      data: associations,
    });
  });

  /**
   * Get nearby associations
   * GET /api/v1/associations/nearby
   */
  getNearby = asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, radius, limit } = req.query;

    if (!latitude || !longitude) {
      throw new AppError(
        400,
        'Latitude et longitude requises',
        'MISSING_COORDINATES'
      );
    }

    const associations = await associationService.getNearby(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      radius ? parseFloat(radius as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: associations,
    });
  });

  /**
   * Get association by ID
   * GET /api/v1/associations/:associationId
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const { associationId } = req.params;
    const association = await associationService.getById(associationId);

    res.json({
      success: true,
      data: association,
    });
  });

  /**
   * Get association reports (public)
   * GET /api/v1/associations/:associationId/reports
   */
  getReports = asyncHandler(async (req: Request, res: Response) => {
    const { associationId } = req.params;
    const { page, limit } = req.query;

    const result = await associationService.getReports(
      associationId,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: normalizeImagesList(result.reports),
      pagination: {
        total: result.total,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      },
    });
  });

  // ==================== ASSOCIATION USER ENDPOINTS ====================

  /**
   * Register association profile
   * POST /api/v1/associations/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const association = await associationService.register(userId, req.body);

    res.status(201).json({
      success: true,
      message:
        'Profil association créé avec succès. En attente de vérification.',
      data: association,
    });
  });

  /**
   * Get my association profile
   * GET /api/v1/associations/me
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const profile = await associationService.getProfile(userId);

    res.json({
      success: true,
      data: profile,
    });
  });

  /**
   * Update my association profile
   * PUT /api/v1/associations/me
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const profile = await associationService.updateProfile(userId, req.body);

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: profile,
    });
  });

  /**
   * Create report
   * POST /api/v1/associations/me/reports
   */
  createReport = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const report = await associationService.createReport(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Rapport créé avec succès',
      data: normalizeImages(report),
    });
  });

  /**
   * Get my reports
   * GET /api/v1/associations/me/reports
   */
  getMyReports = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { page, limit } = req.query;

    const result = await associationService.getMyReports(
      userId,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: normalizeImagesList(result.reports),
      pagination: {
        total: result.total,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10,
      },
    });
  });

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all associations (admin)
   * GET /api/v1/admin/associations
   */
  adminGetAll = asyncHandler(async (req: Request, res: Response) => {
    const { search, verified, page, limit } = req.query;

    const result = await associationService.getAll({
      search: search as string,
      verified:
        verified === 'true' ? true : verified === 'false' ? false : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.associations,
      pagination: {
        total: result.total,
        pages: result.pages,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      },
    });
  });

  /**
   * Get pending verification associations (admin)
   * GET /api/v1/admin/associations/pending
   */
  adminGetPending = asyncHandler(async (_req: Request, res: Response) => {
    const associations = await associationService.getPendingVerification();

    res.json({
      success: true,
      data: associations,
    });
  });

  /**
   * Verify an association (admin)
   * POST /api/v1/admin/associations/:associationId/verify
   */
  adminVerify = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const { associationId } = req.params;

    const association = await associationService.verify(adminId, associationId);

    res.json({
      success: true,
      message: 'Association vérifiée avec succès',
      data: association,
    });
  });

  /**
   * Reject association verification (admin)
   * POST /api/v1/admin/associations/:associationId/reject
   */
  adminReject = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user.id;
    const { associationId } = req.params;
    const { reason } = req.body as { reason: string };

    await associationService.reject(adminId, associationId, reason);

    res.json({
      success: true,
      message: 'Association rejetée',
    });
  });

  /**
   * Get global association stats (admin)
   * GET /api/v1/admin/associations/stats
   */
  adminGetStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await associationService.getGlobalStats();

    res.json({
      success: true,
      data: stats,
    });
  });
}

export default new AssociationController();
