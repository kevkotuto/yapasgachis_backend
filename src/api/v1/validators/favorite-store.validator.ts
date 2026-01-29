import { z } from 'zod';

/**
 * Add favorite store validator
 */
export const addFavoriteStoreSchema = z.object({
  body: z.object({
    supplierStoreId: z.string().uuid('ID de magasin invalide'),
  }),
});

export type AddFavoriteStoreInput = z.infer<
  typeof addFavoriteStoreSchema
>['body'];

/**
 * Remove favorite store validator
 */
export const removeFavoriteStoreSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('ID de magasin invalide'),
  }),
});

export type RemoveFavoriteStoreInput = z.infer<
  typeof removeFavoriteStoreSchema
>['params'];

/**
 * Get user favorite stores validator
 */
export const getUserFavoriteStoresSchema = z.object({
  query: z.object({
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1))
      .optional()
      .default('1'),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(100))
      .optional()
      .default('20'),
  }),
});

export type GetUserFavoriteStoresInput = z.infer<
  typeof getUserFavoriteStoresSchema
>['query'];

/**
 * Check if favorite validator
 */
export const checkIsFavoriteSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('ID de magasin invalide'),
  }),
});

export type CheckIsFavoriteInput = z.infer<
  typeof checkIsFavoriteSchema
>['params'];

/**
 * Toggle favorite validator
 */
export const toggleFavoriteSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('ID de magasin invalide'),
  }),
});

export type ToggleFavoriteInput = z.infer<
  typeof toggleFavoriteSchema
>['params'];
