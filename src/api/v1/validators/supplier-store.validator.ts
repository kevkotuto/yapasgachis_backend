import { z } from 'zod';

// Operating hours schema
const operatingHoursSchema = z.record(
  z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
    close: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  })
);

// ==================== STORE VALIDATORS ====================

export const createStoreSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(2, 'Le nom doit avoir au moins 2 caractères')
        .max(100),
      description: z.string().max(500).optional(),
      images: z.array(z.string().url()).optional(),
      address: z.string().min(5, "L'adresse doit avoir au moins 5 caractères"),
      city: z.string().min(2),
      commune: z.string().optional(),
      neighborhood: z.string().optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      phoneNumber: z.string().optional(),
      email: z.string().email().optional(),
      operatingHours: operatingHoursSchema,
      deliveryEnabled: z.boolean().default(false),
      pickupEnabled: z.boolean().default(true),
      deliveryRadius: z.number().positive().optional(),

      // Delivery Pricing Configuration
      deliveryPricingMode: z
        .enum(['FLAT', 'DISTANCE_BASED'])
        .default('DISTANCE_BASED'),
      deliveryBasePrice: z.number().min(0).max(50000).optional().nullable(),
      deliveryPricePerKm: z.number().min(0).max(5000).optional().nullable(),
      deliveryFlatPrice: z.number().min(0).max(50000).optional().nullable(),

      acceptCashPayment: z.boolean().default(false),
      waveAccountId: z.string().optional(),
    })
    .refine(
      (data) => {
        // Si mode FLAT, deliveryFlatPrice doit être défini
        if (data.deliveryPricingMode === 'FLAT' && !data.deliveryFlatPrice) {
          return false;
        }
        // Si mode DISTANCE_BASED, les deux champs doivent être définis si la livraison est activée
        if (
          data.deliveryPricingMode === 'DISTANCE_BASED' &&
          data.deliveryEnabled &&
          (!data.deliveryBasePrice || !data.deliveryPricePerKm)
        ) {
          return false;
        }
        return true;
      },
      {
        message:
          'Les champs de tarification doivent correspondre au mode sélectionné',
      }
    ),
});

export const updateStoreSchema = z.object({
  params: z.object({
    storeId: z.string().uuid(),
  }),
  body: z
    .object({
      name: z.string().min(2).max(100).optional(),
      description: z.string().max(500).optional().nullable(),
      images: z.array(z.string().url()).optional(),
      address: z.string().min(5).optional(),
      city: z.string().min(2).optional(),
      commune: z.string().optional().nullable(),
      neighborhood: z.string().optional().nullable(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      phoneNumber: z.string().optional().nullable(),
      email: z.string().email().optional().nullable(),
      operatingHours: operatingHoursSchema.optional(),
      deliveryEnabled: z.boolean().optional(),
      pickupEnabled: z.boolean().optional(),
      deliveryRadius: z.number().positive().optional().nullable(),

      // Delivery Pricing Configuration
      deliveryPricingMode: z.enum(['FLAT', 'DISTANCE_BASED']).optional(),
      deliveryBasePrice: z.number().min(0).max(50000).optional().nullable(),
      deliveryPricePerKm: z.number().min(0).max(5000).optional().nullable(),
      deliveryFlatPrice: z.number().min(0).max(50000).optional().nullable(),

      acceptCashPayment: z.boolean().optional(),
      waveAccountId: z.string().optional().nullable(),
    })
    .refine(
      (data) => {
        // Si mode FLAT est spécifié, deliveryFlatPrice doit être défini
        if (
          data.deliveryPricingMode === 'FLAT' &&
          data.deliveryFlatPrice === undefined
        ) {
          return false;
        }
        // Si mode DISTANCE_BASED est spécifié, les deux champs doivent être définis
        if (
          data.deliveryPricingMode === 'DISTANCE_BASED' &&
          (data.deliveryBasePrice === undefined ||
            data.deliveryPricePerKm === undefined)
        ) {
          return false;
        }
        return true;
      },
      {
        message:
          'Les champs de tarification doivent correspondre au mode sélectionné',
      }
    ),
});

export const storeIdParamSchema = z.object({
  params: z.object({
    storeId: z.string().uuid(),
  }),
});

export const searchStoresSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    city: z.string().optional(),
    commune: z.string().optional(),
    latitude: z
      .string()
      .transform(Number)
      .pipe(z.number().min(-90).max(90))
      .optional(),
    longitude: z
      .string()
      .transform(Number)
      .pipe(z.number().min(-180).max(180))
      .optional(),
    radius: z.string().transform(Number).pipe(z.number().positive()).optional(),
    page: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive())
      .optional(),
    limit: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive().max(100))
      .optional(),
  }),
});

export const setTemporaryClosureSchema = z.object({
  params: z.object({
    storeId: z.string().uuid(),
  }),
  body: z.object({
    isClosed: z.boolean(),
    reason: z.string().max(200).optional(),
  }),
});

// Export types
export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
export type SearchStoresInput = z.infer<typeof searchStoresSchema>;
export type SetTemporaryClosureInput = z.infer<
  typeof setTemporaryClosureSchema
>;
