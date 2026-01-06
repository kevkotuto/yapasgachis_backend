import { Request, Response, NextFunction } from 'express';
import supplierStoreService from '@/core/services/supplier-store.service';
import { AppError } from '@/middleware/error-handler.middleware';
import logger from '@/infrastructure/monitoring/logger';

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
  async searchStores(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        search,
        city,
        commune,
        latitude,
        longitude,
        radius,
        page,
        limit,
      } = req.query;

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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get store by ID
   * GET /api/v1/stores/:storeId
   */
  async getStoreById(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get nearby stores
   * GET /api/v1/stores/nearby
   */
  async getNearbyStores(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  // ==================== SUPPLIER ENDPOINTS ====================

  /**
   * Create a store
   * POST /api/v1/supplier/stores
   */
  async createStore(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a store
   * PUT /api/v1/supplier/stores/:storeId
   */
  async updateStore(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a store
   * DELETE /api/v1/supplier/stores/:storeId
   */
  async deleteStore(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supplier's stores
   * GET /api/v1/supplier/stores
   */
  async getSupplierStores(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get store statistics
   * GET /api/v1/supplier/stores/:storeId/statistics
   */
  async getStoreStatistics(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set temporary closure
   * POST /api/v1/supplier/stores/:storeId/temporary-closure
   */
  async setTemporaryClosure(req: Request, res: Response, next: NextFunction) {
    try {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
      }

      const { storeId } = req.params;
      const { isClosed, reason } = req.body;

      const store = await supplierStoreService.setTemporaryClosure(
        supplierId,
        storeId,
        isClosed,
        reason
      );

      res.json({
        success: true,
        message: isClosed
          ? 'Magasin temporairement fermé'
          : 'Magasin réouvert',
        data: store,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle store active status
   * POST /api/v1/supplier/stores/:storeId/toggle-active
   */
  async toggleStoreActive(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (error) {
      next(error);
    }
  }
}

export default new SupplierStoreController();
