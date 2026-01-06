import { Request, Response } from 'express';

import supplierStoreService from '@/core/services/supplier-store.service';
import { AppError, asyncHandler } from '@/middleware/error-handler.middleware';

/**
 * Supplier Store Controller
 * Handles supplier stores/branches
 */
export class SupplierStoreController {
  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Search stores
   * GET /api/v1/stores
   */
  searchStores = asyncHandler(async (req: Request, res: Response) => {
    const { search, city, commune, latitude, longitude, radius, page, limit } =
      req.query;

    const result = await supplierStoreService.searchStores({
      search: search as string,
      city: city as string,
      commune: commune as string,
      latitude: latitude ? parseFloat(latitude as string) : undefined,
      longitude: longitude ? parseFloat(longitude as string) : undefined,
      radius: radius ? parseFloat(radius as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.stores,
      pagination: {
        total: result.total,
        pages: result.pages,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      },
    });
  });

  /**
   * Get store by ID
   * GET /api/v1/stores/:storeId
   */
  getStoreById = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const store = await supplierStoreService.getStoreById(storeId);

    // Add open status
    const openStatus = supplierStoreService.isStoreOpen(store);

    res.json({
      success: true,
      data: {
        ...store,
        ...openStatus,
      },
    });
  });

  /**
   * Get nearby stores
   * GET /api/v1/stores/nearby
   */
  getNearbyStores = asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, radius, limit } = req.query;

    if (!latitude || !longitude) {
      throw new AppError(400, 'Coordonnées requises', 'COORDINATES_REQUIRED');
    }

    const stores = await supplierStoreService.getNearbyStores(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      radius ? parseFloat(radius as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: stores,
    });
  });

  // ==================== SUPPLIER ENDPOINTS ====================

  /**
   * Create a store
   * POST /api/v1/supplier/stores
   */
  createStore = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const store = await supplierStoreService.createStore(supplierId, req.body);

    res.status(201).json({
      success: true,
      message: 'Magasin créé avec succès',
      data: store,
    });
  });

  /**
   * Update a store
   * PUT /api/v1/supplier/stores/:storeId
   */
  updateStore = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const { storeId } = req.params;

    const store = await supplierStoreService.updateStore(
      supplierId,
      storeId,
      req.body
    );

    res.json({
      success: true,
      message: 'Magasin mis à jour avec succès',
      data: store,
    });
  });

  /**
   * Delete a store
   * DELETE /api/v1/supplier/stores/:storeId
   */
  deleteStore = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const { storeId } = req.params;

    await supplierStoreService.deleteStore(supplierId, storeId);

    res.json({
      success: true,
      message: 'Magasin supprimé avec succès',
    });
  });

  /**
   * Get supplier's stores
   * GET /api/v1/supplier/stores
   */
  getSupplierStores = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const stores = await supplierStoreService.getSupplierStores(supplierId);

    // Add open status to each store
    const storesWithStatus = stores.map((store) => ({
      ...store,
      ...supplierStoreService.isStoreOpen(store),
    }));

    res.json({
      success: true,
      data: storesWithStatus,
    });
  });

  /**
   * Get store statistics
   * GET /api/v1/supplier/stores/:storeId/statistics
   */
  getStoreStatistics = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const { storeId } = req.params;

    const statistics = await supplierStoreService.getStoreStatistics(
      supplierId,
      storeId
    );

    res.json({
      success: true,
      data: statistics,
    });
  });

  /**
   * Set temporary closure
   * POST /api/v1/supplier/stores/:storeId/temporary-closure
   */
  setTemporaryClosure = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const { storeId } = req.params;
    const { isClosed, reason } = req.body as {
      isClosed: boolean;
      reason?: string;
    };

    const store = await supplierStoreService.setTemporaryClosure(
      supplierId,
      storeId,
      isClosed,
      reason
    );

    res.json({
      success: true,
      message: isClosed ? 'Magasin temporairement fermé' : 'Magasin réouvert',
      data: store,
    });
  });

  /**
   * Toggle store active status
   * POST /api/v1/supplier/stores/:storeId/toggle-active
   */
  toggleStoreActive = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const { storeId } = req.params;

    const store = await supplierStoreService.toggleStoreActive(
      supplierId,
      storeId
    );

    res.json({
      success: true,
      message: store.isActive ? 'Magasin activé' : 'Magasin désactivé',
      data: store,
    });
  });
}

export default new SupplierStoreController();
