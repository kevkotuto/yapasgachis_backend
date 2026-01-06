import { ProductCategory, ProductStatus } from '@prisma/client';
import { z } from 'zod';

/**
 * Product Validators
 * Zod schemas for product-related requests
 */

// Create product
export const createProductSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(3, 'Le nom du produit doit contenir au moins 3 caractères')
        .max(200, 'Le nom du produit ne peut pas dépasser 200 caractères'),
      description: z
        .string()
        .min(10, 'La description doit contenir au moins 10 caractères')
        .max(2000, 'La description ne peut pas dépasser 2000 caractères')
        .optional(),
      category: z.nativeEnum(ProductCategory, {
        required_error: 'La catégorie est requise',
      }),
      originalPrice: z
        .number()
        .positive('Le prix original doit être positif')
        .min(0.01, 'Le prix minimum est 0.01'),
      price: z
        .number()
        .positive('Le prix doit être positif')
        .min(0.01, 'Le prix minimum est 0.01'),
      quantity: z
        .number()
        .int('La quantité doit être un nombre entier')
        .positive('La quantité doit être positive')
        .min(1, 'La quantité minimum est 1'),
      unit: z.string().max(20).optional(),
      expiresAt: z
        .string()
        .datetime("Date d'expiration invalide")
        .transform((val) => new Date(val))
        .refine((date) => date > new Date(), {
          message: "La date d'expiration doit être dans le futur",
        }),
      images: z.array(z.string().url()).optional(),
      tags: z.array(z.string().max(50)).max(10).optional(),
      pickupLocation: z.string().max(500).optional(),
      pickupInstructions: z.string().max(1000).optional(),
    })
    .refine((data) => data.price < data.originalPrice, {
      message: 'Le prix réduit doit être inférieur au prix original',
      path: ['price'],
    }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];

// Update product
export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de produit invalide'),
  }),
  body: z
    .object({
      name: z.string().min(3).max(200).optional(),
      description: z.string().min(10).max(2000).optional(),
      category: z.nativeEnum(ProductCategory).optional(),
      originalPrice: z.number().positive().min(0.01).optional(),
      price: z.number().positive().min(0.01).optional(),
      quantity: z.number().int().min(0).optional(),
      unit: z.string().max(20).optional(),
      expiresAt: z
        .string()
        .datetime()
        .transform((val) => new Date(val))
        .optional(),
      status: z.nativeEnum(ProductStatus).optional(),
      images: z.array(z.string().url()).optional(),
      tags: z.array(z.string().max(50)).max(10).optional(),
      pickupLocation: z.string().max(500).optional(),
      pickupInstructions: z.string().max(1000).optional(),
    })
    .partial()
    .refine(
      (data) => {
        if (data.price && data.originalPrice) {
          return data.price < data.originalPrice;
        }
        return true;
      },
      {
        message: 'Le prix réduit doit être inférieur au prix original',
        path: ['price'],
      }
    ),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// Get product by ID
export const getProductByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de produit invalide'),
  }),
});

export type GetProductByIdInput = z.infer<
  typeof getProductByIdSchema
>['params'];

// Delete product
export const deleteProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de produit invalide'),
  }),
});

export type DeleteProductInput = z.infer<typeof deleteProductSchema>['params'];

// Search products
export const searchProductsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    category: z.nativeEnum(ProductCategory).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    supplierId: z.string().uuid().optional(),
    minPrice: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().min(0))
      .optional(),
    maxPrice: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().min(0))
      .optional(),
    minDiscount: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(0).max(100))
      .optional(),
    city: z.string().optional(),
    latitude: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().min(-90).max(90))
      .optional(),
    longitude: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().min(-180).max(180))
      .optional(),
    radius: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional(),
    expiresWithin: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(168)) // Max 7 days
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
    sortBy: z.enum(['price', 'discount', 'expiry', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export type SearchProductsInput = z.infer<typeof searchProductsSchema>['query'];

// Get expiring soon
export const getExpiringSoonSchema = z.object({
  query: z.object({
    hours: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(168))
      .optional()
      .default('24'),
  }),
});

export type GetExpiringSoonInput = z.infer<
  typeof getExpiringSoonSchema
>['query'];

// Get trending
export const getTrendingSchema = z.object({
  query: z.object({
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(50))
      .optional()
      .default('10'),
  }),
});

export type GetTrendingInput = z.infer<typeof getTrendingSchema>['query'];

// Update stock
export const updateStockSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de produit invalide'),
  }),
  body: z.object({
    quantityChange: z
      .number()
      .int('Le changement de quantité doit être un nombre entier')
      .refine((val) => val !== 0, {
        message: 'Le changement de quantité ne peut pas être 0',
      }),
  }),
});

export type UpdateStockInput = z.infer<typeof updateStockSchema>;

// Upload images
export const uploadImagesSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de produit invalide'),
  }),
});

export type UploadImagesInput = z.infer<typeof uploadImagesSchema>['params'];

// Delete image
export const deleteImageSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de produit invalide'),
  }),
  body: z.object({
    imageUrl: z.string().url("URL d'image invalide"),
  }),
});

export type DeleteImageInput = z.infer<typeof deleteImageSchema>;

// Get supplier products
export const getSupplierProductsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(ProductStatus).optional(),
    category: z.nativeEnum(ProductCategory).optional(),
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

export type GetSupplierProductsInput = z.infer<
  typeof getSupplierProductsSchema
>['query'];
