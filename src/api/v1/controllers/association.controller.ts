import { Request, Response, NextFunction } from 'express';
import associationService from '@/core/services/association.service';
import { AppError } from '@/middleware/error-handler.middleware';

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
  async search(req: Request, res: Response, next: NextFunction) {
    try {
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
        verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all verified associations
   * GET /api/v1/associations/verified
   */
  async getAllVerified(req: Request, res: Response, next: NextFunction) {
    try {
      const associations = await associationService.getAllVerified();

      res.json({
        success: true,
        data: associations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get nearby associations
   * GET /api/v1/associations/nearby
   */
  async getNearby(req: Request, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude, radius, limit } = req.query;

      if (!latitude || !longitude) {
        throw new AppError(400, 'Latitude et longitude requises', 'MISSING_COORDINATES');
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get association by ID
   * GET /api/v1/associations/:associationId
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { associationId } = req.params;
      const association = await associationService.getById(associationId);

      res.json({
        success: true,
        data: association,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get association reports (public)
   * GET /api/v1/associations/:associationId/reports
   */
  async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { associationId } = req.params;
      const { page, limit } = req.query;

      const result = await associationService.getReports(
        associationId,
        page ? parseInt(page as string) : undefined,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: result.reports,
        pagination: {
          total: result.total,
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 10,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ASSOCIATION USER ENDPOINTS ====================

  /**
   * Register association profile
   * POST /api/v1/associations/register
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const association = await associationService.register(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Profil association créé avec succès. En attente de vérification.',
        data: association,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my association profile
   * GET /api/v1/associations/me
   */
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const profile = await associationService.getProfile(userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update my association profile
   * PUT /api/v1/associations/me
   */
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const profile = await associationService.updateProfile(userId, req.body);

      res.json({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create report
   * POST /api/v1/associations/me/reports
   */
  async createReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const report = await associationService.createReport(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Rapport créé avec succès',
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my reports
   * GET /api/v1/associations/me/reports
   */
  async getMyReports(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { page, limit } = req.query;

      const result = await associationService.getMyReports(
        userId,
        page ? parseInt(page as string) : undefined,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: result.reports,
        pagination: {
          total: result.total,
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 10,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all associations (admin)
   * GET /api/v1/admin/associations
   */
  async adminGetAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, verified, page, limit } = req.query;

      const result = await associationService.getAll({
        search: search as string,
        verified: verified === 'true' ? true : verified === 'false' ? false : undefined,
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending verification associations (admin)
   * GET /api/v1/admin/associations/pending
   */
  async adminGetPending(req: Request, res: Response, next: NextFunction) {
    try {
      const associations = await associationService.getPendingVerification();

      res.json({
        success: true,
        data: associations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify an association (admin)
   * POST /api/v1/admin/associations/:associationId/verify
   */
  async adminVerify(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const { associationId } = req.params;

      const association = await associationService.verify(adminId, associationId);

      res.json({
        success: true,
        message: 'Association vérifiée avec succès',
        data: association,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject association verification (admin)
   * POST /api/v1/admin/associations/:associationId/reject
   */
  async adminReject(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const { associationId } = req.params;
      const { reason } = req.body;

      await associationService.reject(adminId, associationId, reason);

      res.json({
        success: true,
        message: 'Association rejetée',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get global association stats (admin)
   * GET /api/v1/admin/associations/stats
   */
  async adminGetStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await associationService.getGlobalStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AssociationController();
