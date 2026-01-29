import { Router } from 'express';
import favoriteStoreController from '@/api/v1/controllers/favorite-store.controller';
import {
  addFavoriteStoreSchema,
  removeFavoriteStoreSchema,
  getUserFavoriteStoresSchema,
  checkIsFavoriteSchema,
  toggleFavoriteSchema,
} from '@/api/v1/validators/favorite-store.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// All routes require authentication

// Get user's favorite stores
router.get(
  '/',
  authenticate,
  validate(getUserFavoriteStoresSchema),
  favoriteStoreController.getUserFavorites
);

// Add a store to favorites
router.post(
  '/',
  authenticate,
  validate(addFavoriteStoreSchema),
  favoriteStoreController.addFavorite
);

// Check if a store is in favorites
router.get(
  '/:storeId/check',
  authenticate,
  validate(checkIsFavoriteSchema),
  favoriteStoreController.checkIsFavorite
);

// Toggle favorite status
router.post(
  '/:storeId/toggle',
  authenticate,
  validate(toggleFavoriteSchema),
  favoriteStoreController.toggleFavorite
);

// Remove a store from favorites
router.delete(
  '/:storeId',
  authenticate,
  validate(removeFavoriteStoreSchema),
  favoriteStoreController.removeFavorite
);

export default router;
