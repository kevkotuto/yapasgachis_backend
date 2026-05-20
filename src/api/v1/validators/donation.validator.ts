import { DonationType, DonationStatus } from '@prisma/client';
import { z } from 'zod';

// ==================== DONATION VALIDATORS ====================

export const createFoodDonationSchema = z.object({
  body: z.object({
    associationId: z.string().uuid('ID association invalide'),
    productId: z.string().uuid('ID produit invalide'),
    quantity: z.number().positive('La quantité doit être positive'),
    unit: z.enum(['kg', 'piece', 'portion', 'liter', 'box'], {
      errorMap: () => ({ message: 'Unité invalide' }),
    }),
    pickupScheduled: z.string().datetime().optional(),
  }),
});

export const createFinancialDonationSchema = z.object({
  body: z.object({
    associationId: z.string().uuid('ID association invalide'),
    amount: z
      .number()
      .positive('Le montant doit être positif')
      .min(100, 'Le montant minimum est de 100 XOF'),
    currency: z.string().default('XOF'),
    paymentReference: z.string().optional(),
  }),
});

// Don en nature : ouvert à tout utilisateur (sans produit du catalogue).
// La catégorie de biens est stockée dans le champ `unit` de la donation.
export const createInKindDonationSchema = z.object({
  body: z.object({
    associationId: z.string().uuid('ID association invalide'),
    category: z
      .string()
      .min(2, 'La catégorie est requise')
      .max(50, 'La catégorie ne peut pas dépasser 50 caractères'),
    quantity: z.number().positive('La quantité doit être positive'),
    pickupScheduled: z
      .string()
      .datetime('Date de collecte invalide')
      .optional(),
  }),
});

export const donationIdParamSchema = z.object({
  params: z.object({
    donationId: z.string().uuid('ID donation invalide'),
  }),
});

export const updateDonationStatusSchema = z.object({
  params: z.object({
    donationId: z.string().uuid('ID donation invalide'),
  }),
  body: z.object({
    status: z.nativeEnum(DonationStatus, {
      errorMap: () => ({ message: 'Statut invalide' }),
    }),
  }),
});

export const schedulePickupSchema = z.object({
  params: z.object({
    donationId: z.string().uuid('ID donation invalide'),
  }),
  body: z.object({
    pickupDate: z.string().datetime('Date de collecte invalide'),
  }),
});

export const cancelDonationSchema = z.object({
  params: z.object({
    donationId: z.string().uuid('ID donation invalide'),
  }),
  body: z.object({
    reason: z
      .string()
      .max(500, 'La raison ne peut pas dépasser 500 caractères')
      .optional(),
  }),
});

export const getDonationsQuerySchema = z.object({
  query: z.object({
    type: z.nativeEnum(DonationType).optional(),
    status: z.nativeEnum(DonationStatus).optional(),
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

export const searchDonationsSchema = z.object({
  query: z.object({
    type: z.nativeEnum(DonationType).optional(),
    status: z.nativeEnum(DonationStatus).optional(),
    associationId: z.string().uuid().optional(),
    donorId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
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

// Export types
export type CreateFoodDonationInput = z.infer<typeof createFoodDonationSchema>;
export type CreateFinancialDonationInput = z.infer<
  typeof createFinancialDonationSchema
>;
export type UpdateDonationStatusInput = z.infer<
  typeof updateDonationStatusSchema
>;
export type SchedulePickupInput = z.infer<typeof schedulePickupSchema>;
export type CancelDonationInput = z.infer<typeof cancelDonationSchema>;
export type GetDonationsQueryInput = z.infer<typeof getDonationsQuerySchema>;
export type SearchDonationsInput = z.infer<typeof searchDonationsSchema>;
