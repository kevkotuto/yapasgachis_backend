import { z } from 'zod';

import { APP_CONSTANTS } from './constants';

// Phone number validator
export const phoneSchema = z
  .string()
  .regex(APP_CONSTANTS.REGEX.PHONE, 'Numéro de téléphone invalide');

// Email validator
export const emailSchema = z.string().email('Email invalide').toLowerCase();

// Password validator
export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(
    /[@$!%*?&]/,
    'Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)'
  );

// UUID validator
export const uuidSchema = z.string().uuid('ID invalide');

// Pagination validators
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Coordinates validators
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Date validators
export const dateSchema = z.coerce.date();

export const futureDateSchema = z.coerce
  .date()
  .refine((date) => date > new Date(), 'La date doit être dans le futur');

// File upload validators
export const imageFileSchema = z.object({
  mimetype: z
    .string()
    .refine(
      (type) => ['image/jpeg', 'image/png', 'image/webp'].includes(type),
      "Format d'image invalide. Formats acceptés: JPEG, PNG, WEBP"
    ),
  size: z
    .number()
    .max(10 * 1024 * 1024, 'La taille du fichier ne doit pas dépasser 10MB'),
});

// OTP validator
export const otpSchema = z
  .string()
  .length(6, 'Le code OTP doit contenir 6 chiffres')
  .regex(/^\d+$/, 'Le code OTP ne doit contenir que des chiffres');

// Price validators
export const priceSchema = z
  .number()
  .positive('Le prix doit être positif')
  .max(10000000, 'Prix maximum dépassé');

export const discountPriceSchema = z
  .number()
  .positive('Le prix réduit doit être positif');

// Quantity validators
export const quantitySchema = z
  .number()
  .int('La quantité doit être un nombre entier')
  .positive('La quantité doit être positive');

// Common validators
export const nameSchema = z
  .string()
  .min(2, 'Le nom doit contenir au moins 2 caractères')
  .max(100, 'Le nom ne doit pas dépasser 100 caractères')
  .trim();

export const descriptionSchema = z
  .string()
  .min(10, 'La description doit contenir au moins 10 caractères')
  .max(2000, 'La description ne doit pas dépasser 2000 caractères')
  .trim();

export const addressSchema = z
  .string()
  .min(5, "L'adresse doit contenir au moins 5 caractères")
  .max(500, "L'adresse ne doit pas dépasser 500 caractères")
  .trim();

// URL validator
export const urlSchema = z.string().url('URL invalide');

// Custom validation helpers
export const validateProductPrices = (
  originalPrice: number,
  discountedPrice: number
): boolean => {
  return discountedPrice < originalPrice && discountedPrice > 0;
};

export const validateExpiryDate = (date: Date): boolean => {
  return new Date(date) > new Date();
};

export const validatePickupSlot = (slot: Date): boolean => {
  const now = new Date();
  const slotDate = new Date(slot);
  return slotDate > now;
};

// Validation error formatter
export const formatValidationErrors = (
  error: z.ZodError
): Record<string, string[]> => {
  const errors: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(err.message);
  });

  return errors;
};
