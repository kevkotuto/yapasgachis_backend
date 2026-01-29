import { StockMovementType } from '@prisma/client';
import { z } from 'zod';

/**
 * Stock Movement Validators
 * Zod schemas for stock movement-related requests
 */

// Create stock movement
export const createStockMovementSchema = z.object({
  body: z.object({
    productId: z.string().uuid('ID de produit invalide'),
    type: z.nativeEnum(StockMovementType, {
      required_error: 'Le type de mouvement est requis',
      invalid_type_error: 'Type de mouvement invalide',
    }),
    quantity: z
      .number()
      .int('La quantité doit être un nombre entier')
      .refine((val) => val !== 0, {
        message: 'La quantité ne peut pas être zéro',
      }),
    orderId: z.string().uuid('ID de commande invalide').optional(),
    storeId: z.string().uuid('ID de magasin invalide').optional(),
    reason: z
      .string()
      .min(3, 'La raison doit contenir au moins 3 caractères')
      .max(500, 'La raison ne peut pas dépasser 500 caractères')
      .optional(),
    notes: z
      .string()
      .max(1000, 'Les notes ne peuvent pas dépasser 1000 caractères')
      .optional(),
  }),
});

export type CreateStockMovementInput = z.infer<
  typeof createStockMovementSchema
>['body'];

// List stock movements
export const listStockMovementsSchema = z.object({
  query: z.object({
    type: z.nativeEnum(StockMovementType).optional(),
    productId: z.string().uuid('ID de produit invalide').optional(),
    storeId: z.string().uuid('ID de magasin invalide').optional(),
    startDate: z
      .string()
      .datetime('Date de début invalide')
      .transform((val) => new Date(val))
      .optional(),
    endDate: z
      .string()
      .datetime('Date de fin invalide')
      .transform((val) => new Date(val))
      .optional(),
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1))
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional(),
  }),
});

export type ListStockMovementsInput = z.infer<
  typeof listStockMovementsSchema
>['query'];

// Get product stock history
export const getProductHistorySchema = z.object({
  params: z.object({
    productId: z.string().uuid('ID de produit invalide'),
  }),
  query: z.object({
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1))
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional(),
  }),
});

export type GetProductHistoryInput = z.infer<typeof getProductHistorySchema>;

// Get store stock movements
export const getStoreMovementsSchema = z.object({
  params: z.object({
    storeId: z.string().uuid('ID de magasin invalide'),
  }),
  query: z.object({
    type: z.nativeEnum(StockMovementType).optional(),
    productId: z.string().uuid('ID de produit invalide').optional(),
    startDate: z
      .string()
      .datetime('Date de début invalide')
      .transform((val) => new Date(val))
      .optional(),
    endDate: z
      .string()
      .datetime('Date de fin invalide')
      .transform((val) => new Date(val))
      .optional(),
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1))
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional(),
  }),
});

export type GetStoreMovementsInput = z.infer<typeof getStoreMovementsSchema>;
