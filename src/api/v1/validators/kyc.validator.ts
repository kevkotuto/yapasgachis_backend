/**
 * KYC Validators
 * Phase 12: AI-based identity verification
 *
 * Zod schemas for KYC endpoints validation
 */

import { z } from 'zod';

// ==================== ID Card Types ====================

export const IdCardTypeEnum = z.enum([
  'CNI',
  'PASSPORT',
  'DRIVING_LICENSE',
  'RESIDENCE_CARD',
]);

export const KycVerificationStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'AI_APPROVED',
  'AI_REJECTED',
  'MANUAL_REVIEW',
  'MANUALLY_APPROVED',
  'MANUALLY_REJECTED',
  'FAILED',
]);

// ==================== Supplier KYC Schemas ====================

/**
 * Submit KYC documents schema
 */
export const submitKycSchema = z.object({
  body: z.object({
    idCardType: IdCardTypeEnum,
    idCardNumber: z
      .string()
      .min(5, 'Numéro de document trop court')
      .max(30, 'Numéro de document trop long')
      .optional(),
    idCardExpiry: z
      .string()
      .datetime()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          return new Date(val) > new Date();
        },
        { message: "La date d'expiration doit être dans le futur" }
      ),
  }),
});

/**
 * Get KYC status schema (no body required)
 */
export const getKycStatusSchema = z.object({
  params: z
    .object({
      supplierId: z.string().uuid('ID fournisseur invalide').optional(),
    })
    .optional(),
});

/**
 * Resubmit KYC schema
 */
export const resubmitKycSchema = z.object({
  body: z.object({
    idCardType: IdCardTypeEnum,
    idCardNumber: z.string().min(5).max(30).optional(),
    idCardExpiry: z.string().datetime().optional(),
  }),
});

// ==================== Admin KYC Schemas ====================

/**
 * Admin review attempt schema
 */
export const adminReviewKycSchema = z.object({
  params: z.object({
    attemptId: z.string().uuid('ID de tentative invalide'),
  }),
  body: z.object({
    approve: z.boolean(),
    notes: z.string().max(1000, 'Notes trop longues').optional(),
  }),
});

/**
 * Admin get pending reviews schema
 */
export const getPendingReviewsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive())
      .optional()
      .default('1'),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(100))
      .optional()
      .default('20'),
    sortBy: z
      .enum(['createdAt', 'overallScore', 'processingDurationMs'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * Admin get all attempts schema
 */
export const getAttemptsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive())
      .optional()
      .default('1'),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(100))
      .optional()
      .default('20'),
    status: z
      .string()
      .optional()
      .transform((val) =>
        val
          ? (val.split(',') as z.infer<typeof KycVerificationStatusEnum>[])
          : undefined
      ),
    supplierId: z.string().uuid().optional(),
    provider: z.string().optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    minScore: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().min(0).max(100))
      .optional(),
    maxScore: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().min(0).max(100))
      .optional(),
    idCardType: IdCardTypeEnum.optional(),
    sortBy: z
      .enum(['createdAt', 'overallScore', 'processingDurationMs'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * Admin get attempt details schema
 */
export const getAttemptDetailsSchema = z.object({
  params: z.object({
    attemptId: z.string().uuid('ID de tentative invalide'),
  }),
});

/**
 * Admin force verify schema
 */
export const forceVerifySchema = z.object({
  params: z.object({
    supplierId: z.string().uuid('ID fournisseur invalide'),
  }),
  body: z.object({
    notes: z.string().max(500, 'Notes trop longues').optional(),
  }),
});

/**
 * Admin request resubmission schema
 */
export const requestResubmissionSchema = z.object({
  params: z.object({
    supplierId: z.string().uuid('ID fournisseur invalide'),
  }),
  body: z.object({
    reason: z
      .string()
      .min(10, 'Raison trop courte')
      .max(500, 'Raison trop longue'),
  }),
});

// ==================== Type Exports ====================

export type SubmitKycInput = z.infer<typeof submitKycSchema>;
export type GetKycStatusInput = z.infer<typeof getKycStatusSchema>;
export type ResubmitKycInput = z.infer<typeof resubmitKycSchema>;
export type AdminReviewKycInput = z.infer<typeof adminReviewKycSchema>;
export type GetPendingReviewsInput = z.infer<typeof getPendingReviewsSchema>;
export type GetAttemptsInput = z.infer<typeof getAttemptsSchema>;
export type GetAttemptDetailsInput = z.infer<typeof getAttemptDetailsSchema>;
export type ForceVerifyInput = z.infer<typeof forceVerifySchema>;
export type RequestResubmissionInput = z.infer<
  typeof requestResubmissionSchema
>;
