import { z } from 'zod';

/**
 * Frontend log level enum
 */
const frontendLogLevelSchema = z.enum(['error', 'warn', 'info', 'debug'], {
  errorMap: () => ({
    message:
      'Niveau de log invalide. Valeurs autorisées: error, warn, info, debug',
  }),
});

/**
 * Create frontend log validation schema
 * POST /api/v1/logs
 */
export const createFrontendLogSchema = z.object({
  body: z.object({
    // Required fields
    message: z
      .string()
      .min(1, 'Le message est requis')
      .max(5000, 'Le message ne doit pas dépasser 5000 caractères')
      .trim(),
    level: frontendLogLevelSchema,
    timestamp: z
      .string()
      .datetime({ message: 'Format de timestamp invalide (ISO 8601 requis)' })
      .optional()
      .transform((val) => (val ? new Date(val) : new Date())),

    // Context fields (optional)
    page: z
      .string()
      .max(255, 'Le nom de page ne doit pas dépasser 255 caractères')
      .trim()
      .optional(),
    action: z
      .string()
      .max(255, "L'action ne doit pas dépasser 255 caractères")
      .trim()
      .optional(),

    // Technical fields (optional)
    userAgent: z
      .string()
      .max(2000, 'Le user agent ne doit pas dépasser 2000 caractères')
      .optional(),
    stack: z
      .string()
      .max(10000, 'La stack trace ne doit pas dépasser 10000 caractères')
      .optional(),
    file: z
      .string()
      .max(500, 'Le chemin de fichier ne doit pas dépasser 500 caractères')
      .trim()
      .optional(),
    line: z
      .number()
      .int('Le numéro de ligne doit être un entier')
      .positive('Le numéro de ligne doit être positif')
      .optional(),

    // Session tracking (optional)
    sessionId: z
      .string()
      .max(255, "L'ID de session ne doit pas dépasser 255 caractères")
      .trim()
      .optional(),
    deviceId: z
      .string()
      .max(255, "L'ID de device ne doit pas dépasser 255 caractères")
      .trim()
      .optional(),

    // Extensible metadata
    metadata: z.record(z.unknown()).optional(),
  }),
});

/**
 * Query frontend logs validation schema (for admin use)
 * GET /api/v1/logs
 */
export const queryFrontendLogsSchema = z.object({
  query: z.object({
    level: frontendLogLevelSchema.optional(),
    userId: z.string().uuid('ID utilisateur invalide').optional(),
    sessionId: z.string().optional(),
    pageFilter: z.string().optional(),
    startDate: z
      .string()
      .datetime()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
    endDate: z
      .string()
      .datetime()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.min(parseInt(val, 10), 100) : 20)),
  }),
});

export type CreateFrontendLogInput = z.infer<
  typeof createFrontendLogSchema
>['body'];
export type QueryFrontendLogsInput = z.infer<
  typeof queryFrontendLogsSchema
>['query'];
