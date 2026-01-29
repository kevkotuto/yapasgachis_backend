import { z } from 'zod';

/**
 * User Profile Validators
 * Zod schemas for user profile management
 */

// Update profile schema
export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(50).optional(),
    lastName: z.string().min(2).max(50).optional(),
    email: z.string().email().optional(),
    phoneNumber: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/)
      .optional(),
    city: z.string().min(2).max(100).optional(),
    commune: z.string().min(2).max(100).optional(),
    neighborhood: z.string().min(2).max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    language: z.enum(['fr', 'en']).optional(),
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];

// Update avatar schema
export const updateAvatarSchema = z.object({
  body: z.object({
    avatar: z.string().url(),
  }),
});

export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>['body'];

// Check contacts schema (bulk)
export const checkContactsSchema = z.object({
  body: z.object({
    phoneNumbers: z
      .array(z.string().regex(/^\+[1-9]\d{1,14}$/))
      .min(1)
      .max(100),
  }),
});

export type CheckContactsInput = z.infer<typeof checkContactsSchema>['body'];

// Payment method schemas
export const addPaymentMethodSchema = z.object({
  body: z.object({
    provider: z.enum(['WAVE', 'ORANGE_MONEY', 'MTN_MONEY', 'MOOV_MONEY']),
    phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/),
    accountName: z.string().min(2).max(100),
    isDefault: z.boolean().optional().default(false),
  }),
});

export type AddPaymentMethodInput = z.infer<
  typeof addPaymentMethodSchema
>['body'];

// Update payment method schema
export const updatePaymentMethodSchema = z.object({
  params: z.object({
    methodId: z.string().uuid(),
  }),
  body: z.object({
    phoneNumber: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/)
      .optional(),
    accountName: z.string().min(2).max(100).optional(),
    isDefault: z.boolean().optional(),
  }),
});

export type UpdatePaymentMethodInput = z.infer<
  typeof updatePaymentMethodSchema
>;

// Delete payment method schema
export const deletePaymentMethodSchema = z.object({
  params: z.object({
    methodId: z.string().uuid(),
  }),
});

export type DeletePaymentMethodInput = z.infer<
  typeof deletePaymentMethodSchema
>['params'];

// Set default payment method schema
export const setDefaultPaymentMethodSchema = z.object({
  params: z.object({
    methodId: z.string().uuid(),
  }),
});

export type SetDefaultPaymentMethodInput = z.infer<
  typeof setDefaultPaymentMethodSchema
>['params'];
