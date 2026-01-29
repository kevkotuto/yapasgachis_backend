import { Request, Response } from 'express';

import payoutService from '@/core/services/payout.service';
import { AppError, asyncHandler } from '@/middleware/error-handler.middleware';

/**
 * Payout Controller
 * Handles payout method configuration for suppliers and stores
 */
export class PayoutController {
  // ==================== SUPPLIER PAYOUT ENDPOINTS ====================

  /**
   * Configure payout method for supplier
   * PUT /api/v1/supplier/payout
   */
  configureSupplierPayoutMethod = asyncHandler(
    async (req: Request, res: Response) => {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(
          403,
          'Profil fournisseur requis',
          'SUPPLIER_REQUIRED'
        );
      }

      const result = await payoutService.configureSupplierPayoutMethod(
        supplierId,
        req.body
      );

      res.json({
        success: true,
        message: 'Moyen de retrait configuré avec succès',
        data: result,
      });
    }
  );

  /**
   * Get supplier payout method
   * GET /api/v1/supplier/payout
   */
  getSupplierPayoutMethod = asyncHandler(
    async (req: Request, res: Response) => {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(
          403,
          'Profil fournisseur requis',
          'SUPPLIER_REQUIRED'
        );
      }

      const result = await payoutService.getSupplierPayoutMethod(supplierId);

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Remove supplier payout method
   * DELETE /api/v1/supplier/payout
   */
  removeSupplierPayoutMethod = asyncHandler(
    async (req: Request, res: Response) => {
      const supplierId = req.user?.supplierProfileId;

      if (!supplierId) {
        throw new AppError(
          403,
          'Profil fournisseur requis',
          'SUPPLIER_REQUIRED'
        );
      }

      await payoutService.removeSupplierPayoutMethod(supplierId);

      res.json({
        success: true,
        message: 'Moyen de retrait supprimé avec succès',
      });
    }
  );

  // ==================== STORE PAYOUT ENDPOINTS ====================

  /**
   * Configure payout method for store
   * PUT /api/v1/supplier/stores/:storeId/payout
   */
  configureStorePayoutMethod = asyncHandler(
    async (req: Request, res: Response) => {
      const supplierId = req.user?.supplierProfileId;
      const { storeId } = req.params as { storeId: string };

      if (!supplierId) {
        throw new AppError(
          403,
          'Profil fournisseur requis',
          'SUPPLIER_REQUIRED'
        );
      }

      const result = await payoutService.configureStorePayoutMethod(
        storeId,
        supplierId,
        req.body
      );

      res.json({
        success: true,
        message: 'Moyen de retrait du magasin configuré avec succès',
        data: result,
      });
    }
  );

  /**
   * Get store payout method
   * GET /api/v1/supplier/stores/:storeId/payout
   */
  getStorePayoutMethod = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user?.supplierProfileId;
    const { storeId } = req.params as { storeId: string };

    if (!supplierId) {
      throw new AppError(403, 'Profil fournisseur requis', 'SUPPLIER_REQUIRED');
    }

    const result = await payoutService.getStorePayoutMethod(
      storeId,
      supplierId
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Remove store payout method
   * DELETE /api/v1/supplier/stores/:storeId/payout
   */
  removeStorePayoutMethod = asyncHandler(
    async (req: Request, res: Response) => {
      const supplierId = req.user?.supplierProfileId;
      const { storeId } = req.params as { storeId: string };

      if (!supplierId) {
        throw new AppError(
          403,
          'Profil fournisseur requis',
          'SUPPLIER_REQUIRED'
        );
      }

      await payoutService.removeStorePayoutMethod(storeId, supplierId);

      res.json({
        success: true,
        message: 'Moyen de retrait du magasin supprimé avec succès',
      });
    }
  );
}

export default new PayoutController();
