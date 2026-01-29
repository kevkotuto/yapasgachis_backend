import { z } from 'zod';

/**
 * SavedLocation Validators
 * Zod schemas for saved location-related requests
 */

// Create saved location
export const createSavedLocationSchema = z.object({
  body: z.object({
    label: z
      .string()
      .min(1, 'Le libellé est requis')
      .max(100, 'Le libellé ne peut pas dépasser 100 caractères'),
    address: z
      .string()
      .min(3, "L'adresse doit contenir au moins 3 caractères")
      .max(500, "L'adresse ne peut pas dépasser 500 caractères"),
    city: z.string().max(100).optional(),
    commune: z.string().max(100).optional(),
    neighborhood: z.string().max(100).optional(),
    latitude: z
      .number()
      .min(-90, 'La latitude doit être entre -90 et 90')
      .max(90, 'La latitude doit être entre -90 et 90'),
    longitude: z
      .number()
      .min(-180, 'La longitude doit être entre -180 et 180')
      .max(180, 'La longitude doit être entre -180 et 180'),
    instructions: z
      .string()
      .max(1000, 'Les instructions ne peuvent pas dépasser 1000 caractères')
      .optional(),
    phoneNumber: z
      .string()
      .regex(
        /^\+?[1-9]\d{1,14}$/,
        'Numéro de téléphone invalide (format E.164)'
      )
      .optional(),
    isDefault: z.boolean().optional(),
  }),
});

export type CreateSavedLocationInput = z.infer<
  typeof createSavedLocationSchema
>['body'];

// Update saved location
export const updateSavedLocationSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID d'adresse invalide"),
  }),
  body: z
    .object({
      label: z.string().min(1).max(100).optional(),
      address: z.string().min(3).max(500).optional(),
      city: z.string().max(100).optional(),
      commune: z.string().max(100).optional(),
      neighborhood: z.string().max(100).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      instructions: z.string().max(1000).optional(),
      phoneNumber: z
        .string()
        .regex(
          /^\+?[1-9]\d{1,14}$/,
          'Numéro de téléphone invalide (format E.164)'
        )
        .optional(),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Au moins un champ doit être fourni pour la mise à jour',
    }),
});

export type UpdateSavedLocationInput = z.infer<
  typeof updateSavedLocationSchema
>;

// Get saved location by ID
export const getSavedLocationByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID d'adresse invalide"),
  }),
});

export type GetSavedLocationByIdInput = z.infer<
  typeof getSavedLocationByIdSchema
>['params'];

// Delete saved location
export const deleteSavedLocationSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID d'adresse invalide"),
  }),
});

export type DeleteSavedLocationInput = z.infer<
  typeof deleteSavedLocationSchema
>['params'];

// Set default location
export const setDefaultLocationSchema = z.object({
  params: z.object({
    id: z.string().uuid("ID d'adresse invalide"),
  }),
});

export type SetDefaultLocationInput = z.infer<
  typeof setDefaultLocationSchema
>['params'];
