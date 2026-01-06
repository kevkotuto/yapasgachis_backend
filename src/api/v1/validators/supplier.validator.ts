import { z } from 'zod';
import { SupplierType, SubscriptionTier } from '@prisma/client';

/**
 * Supplier Validators
 * Zod schemas for supplier-related requests
 */

// Create supplier profile
export const createSupplierProfileSchema = z.object({
  body: z.object({
    businessName: z
      .string()
      .min(2, 'Le nom de l\'entreprise doit contenir au moins 2 caractères')
      .max(100, 'Le nom de l\'entreprise ne peut pas dépasser 100 caractères'),
    type: z.nativeEnum(SupplierType, {
      required_error: 'Le type de fournisseur est requis',
    }),
    description: z
      .string()
      .min(10, 'La description doit contenir au moins 10 caractères')
      .max(1000, 'La description ne peut pas dépasser 1000 caractères')
      .optional(),
    address: z
      .string()
      .min(5, 'L\'adresse doit contenir au moins 5 caractères')
      .max(200)
      .optional(),
    city: z.string().max(100).optional(),
    phoneNumber: z
      .string()
      .regex(
        /^\+?[1-9]\d{1,14}$/,
        'Numéro de téléphone invalide (format E.164)'
      )
      .optional(),
    email: z.string().email('Email invalide').optional(),
    registrationNumber: z.string().max(50).optional(),
    taxId: z.string().max(50).optional(),
    bankAccountNumber: z.string().max(50).optional(),
    subscriptionTier: z.nativeEnum(SubscriptionTier).optional(),
  }),
});

export type CreateSupplierProfileInput = z.infer<
  typeof createSupplierProfileSchema
>['body'];

// Update supplier profile
export const updateSupplierProfileSchema = z.object({
  body: z
    .object({
      businessName: z
        .string()
        .min(2)
        .max(100)
        .optional(),
      type: z.nativeEnum(SupplierType).optional(),
      description: z
        .string()
        .min(10)
        .max(1000)
        .optional(),
      address: z.string().min(5).max(200).optional(),
      city: z.string().max(100).optional(),
      phoneNumber: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/)
        .optional(),
      email: z.string().email().optional(),
      registrationNumber: z.string().max(50).optional(),
      taxId: z.string().max(50).optional(),
      bankAccountNumber: z.string().max(50).optional(),
      logoUrl: z.string().url('URL invalide').optional(),
      bannerUrl: z.string().url('URL invalide').optional(),
    })
    .partial(),
});

export type UpdateSupplierProfileInput = z.infer<
  typeof updateSupplierProfileSchema
>['body'];

// Search suppliers
export const searchSuppliersSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    type: z.nativeEnum(SupplierType).optional(),
    subscriptionTier: z.nativeEnum(SubscriptionTier).optional(),
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

export type SearchSuppliersInput = z.infer<typeof searchSuppliersSchema>['query'];

// Get supplier by ID
export const getSupplierByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de fournisseur invalide'),
  }),
});

export type GetSupplierByIdInput = z.infer<typeof getSupplierByIdSchema>['params'];

// Update subscription
export const updateSubscriptionSchema = z.object({
  body: z.object({
    tier: z.nativeEnum(SubscriptionTier, {
      required_error: 'Le niveau d\'abonnement est requis',
    }),
    durationMonths: z
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .default(1),
  }),
});

export type UpdateSubscriptionInput = z.infer<
  typeof updateSubscriptionSchema
>['body'];

// Get nearby suppliers
export const getNearbySuppliersSchema = z.object({
  query: z.object({
    latitude: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(
        z.number().min(-90).max(90, 'Latitude doit être entre -90 et 90')
      ),
    longitude: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(
        z.number().min(-180).max(180, 'Longitude doit être entre -180 et 180')
      ),
    radius: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional()
      .default('10'),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(50))
      .optional()
      .default('20'),
  }),
});

export type GetNearbySuppliersInput = z.infer<
  typeof getNearbySuppliersSchema
>['query'];
