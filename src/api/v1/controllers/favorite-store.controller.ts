import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import FavoriteStoreService from '@/core/services/favorite-store.service';
import {
  AddFavoriteStoreInput,
  RemoveFavoriteStoreInput,
  GetUserFavoriteStoresInput,
  CheckIsFavoriteInput,
  ToggleFavoriteInput,
} from '@/api/v1/validators/favorite-store.validator';
import { asyncHandler } from '@/utils/helpers';

const prisma = new PrismaClient();
const favoriteStoreService = new FavoriteStoreService(prisma);

class FavoriteStoreController {
  /**
   * POST /api/v1/favorite-stores
   * Add a store to favorites
   */
  addFavorite = asyncHandler(
    async (
      req: Request<{}, {}, AddFavoriteStoreInput>,
      res: Response
    ): Promise<void> => {
      const userId = (req as any).user.id;
      const { supplierStoreId } = req.body;

      const favorite = await favoriteStoreService.addFavorite({
        userId,
        supplierStoreId,
      });

      res.status(201).json({
        success: true,
        message: 'Magasin ajouté aux favoris',
        data: favorite,
      });
    }
  );

  /**
   * DELETE /api/v1/favorite-stores/:storeId
   * Remove a store from favorites
   */
  removeFavorite = asyncHandler(
    async (
      req: Request<RemoveFavoriteStoreInput>,
      res: Response
    ): Promise<void> => {
      const userId = (req as any).user.id;
      const { storeId } = req.params;

      await favoriteStoreService.removeFavorite({
        userId,
        supplierStoreId: storeId,
      });

      res.json({
        success: true,
        message: 'Magasin retiré des favoris',
      });
    }
  );

  /**
   * GET /api/v1/favorite-stores
   * Get user's favorite stores
   */
  getUserFavorites = asyncHandler(
    async (
      req: Request<{}, {}, {}, GetUserFavoriteStoresInput>,
      res: Response
    ): Promise<void> => {
      const userId = (req as any).user.id;
      const { page, limit } = req.query;

      const result = await favoriteStoreService.getUserFavorites({
        userId,
        page: page as number,
        limit: limit as number,
      });

      res.json({
        success: true,
        data: result.favorites,
        pagination: result.pagination,
      });
    }
  );

  /**
   * GET /api/v1/favorite-stores/:storeId/check
   * Check if a store is in favorites
   */
  checkIsFavorite = asyncHandler(
    async (
      req: Request<CheckIsFavoriteInput>,
      res: Response
    ): Promise<void> => {
      const userId = (req as any).user.id;
      const { storeId } = req.params;

      const result = await favoriteStoreService.checkIsFavorite({
        userId,
        supplierStoreId: storeId,
      });

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * POST /api/v1/favorite-stores/:storeId/toggle
   * Toggle favorite status (add if not exists, remove if exists)
   */
  toggleFavorite = asyncHandler(
    async (req: Request<ToggleFavoriteInput>, res: Response): Promise<void> => {
      const userId = (req as any).user.id;
      const { storeId } = req.params;

      const result = await favoriteStoreService.toggleFavorite(userId, storeId);

      res.json({
        success: true,
        message:
          result.action === 'added'
            ? 'Magasin ajouté aux favoris'
            : 'Magasin retiré des favoris',
        data: result,
      });
    }
  );
}

export default new FavoriteStoreController();
