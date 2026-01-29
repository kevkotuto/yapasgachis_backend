import { Request, Response } from 'express';

import {
  CreateSupplierProfileInput,
  UpdateSupplierProfileInput,
  SearchSuppliersInput,
  GetSupplierByIdInput,
  UpdateSubscriptionInput,
  GetNearbySuppliersInput,
} from '../validators/supplier.validator';

import supplierService from '@/core/services/supplier.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

/**
 * Supplier Controller
 * Handles supplier-related HTTP requests
 */
export class SupplierController {
  /**
   * Create supplier profile
   * POST /api/v1/suppliers/profile
   */
  createProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const body = req.body as CreateSupplierProfileInput;

    const profile = await supplierService.createProfile(
      userId,
      body as Required<CreateSupplierProfileInput>
    );

    logger.info('Supplier profile created via API', {
      userId,
      profileId: profile.id,
    });

    res.status(201).json({
      success: true,
      message: 'Profil fournisseur créé avec succès',
      data: { profile },
    });
  });

  /**
   * Get current supplier's profile
   * GET /api/v1/suppliers/profile
   */
  getMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;

    const profile = await supplierService.getProfile(userId);

    res.json({
      success: true,
      data: { profile },
    });
  });

  /**
   * Get supplier profile by ID
   * GET /api/v1/suppliers/:id
   */
  getProfileById = asyncHandler(
    async (req: Request<GetSupplierByIdInput>, res: Response) => {
      const { id } = req.params;

      const profile = await supplierService.getProfileById(id);

      res.json({
        success: true,
        data: { profile },
      });
    }
  );

  /**
   * Update supplier profile
   * PUT /api/v1/suppliers/profile
   */
  updateProfile = asyncHandler(
    async (req: Request<{}, {}, UpdateSupplierProfileInput>, res: Response) => {
      const userId = req.user.id;
      const files = req.files as {
        idCardFront?: Express.Multer.File[];
        idCardBack?: Express.Multer.File[];
        selfie?: Express.Multer.File[];
      };

      const profile = await supplierService.updateProfile(
        userId,
        req.body,
        files
      );

      logger.info('Supplier profile updated via API', {
        userId,
        profileId: profile.id,
        kycFilesUploaded: !!(
          files?.idCardFront ||
          files?.idCardBack ||
          files?.selfie
        ),
      });

      res.json({
        success: true,
        message: 'Profil fournisseur mis à jour avec succès',
        data: { profile },
      });
    }
  );

  /**
   * Search suppliers
   * GET /api/v1/suppliers/search
   */
  searchSuppliers = asyncHandler(
    async (req: Request<{}, {}, {}, SearchSuppliersInput>, res: Response) => {
      const result = await supplierService.searchSuppliers(req.query);

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Get supplier statistics
   * GET /api/v1/suppliers/statistics
   */
  getStatistics = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;

    const statistics = await supplierService.getStatistics(userId);

    res.json({
      success: true,
      data: { statistics },
    });
  });

  /**
   * Update subscription
   * POST /api/v1/suppliers/subscription
   */
  updateSubscription = asyncHandler(
    async (req: Request<{}, {}, UpdateSubscriptionInput>, res: Response) => {
      const userId = req.user.id;
      const { tier, durationMonths } = req.body;

      const profile = await supplierService.updateSubscription(
        userId,
        tier,
        durationMonths
      );

      logger.info('Supplier subscription updated via API', {
        userId,
        tier,
        durationMonths,
      });

      res.json({
        success: true,
        message: 'Abonnement mis à jour avec succès',
        data: { profile },
      });
    }
  );

  /**
   * Get nearby suppliers
   * GET /api/v1/suppliers/nearby
   */
  getNearbySuppliers = asyncHandler(
    async (
      req: Request<{}, {}, {}, GetNearbySuppliersInput>,
      res: Response
    ) => {
      const { latitude, longitude, radius, limit } = req.query;

      const suppliers = await supplierService.getNearbySuppliers(
        latitude,
        longitude,
        radius,
        limit
      );

      res.json({
        success: true,
        data: { suppliers, count: suppliers.length },
      });
    }
  );

  /**
   * Delete supplier profile
   * DELETE /api/v1/suppliers/profile
   */
  deleteProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;

    await supplierService.deleteProfile(userId);

    logger.info('Supplier profile deleted via API', { userId });

    res.json({
      success: true,
      message: 'Profil fournisseur supprimé avec succès',
    });
  });

  /**
   * Check if can create products
   * GET /api/v1/suppliers/can-create-products
   */
  canCreateProducts = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;

    const result = await supplierService.canCreateProducts(userId);

    res.json({
      success: true,
      data: result,
    });
  });
}

export default new SupplierController();
