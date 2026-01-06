import { z } from 'zod';

// ==================== ASSOCIATION VALIDATORS ====================

export const registerAssociationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, 'Le nom doit avoir au moins 3 caractères')
      .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
    description: z
      .string()
      .min(20, 'La description doit avoir au moins 20 caractères')
      .max(1000, 'La description ne peut pas dépasser 1000 caractères'),
    logo: z.string().url('URL du logo invalide').optional(),
    registrationNumber: z
      .string()
      .min(5, "Le numéro d'enregistrement doit avoir au moins 5 caractères"),
    legalDocuments: z.array(z.string().url()).optional(),
    address: z.string().min(10, "L'adresse doit avoir au moins 10 caractères"),
    serviceArea: z
      .array(z.string())
      .min(1, 'Au moins une zone de service est requise'),
    acceptedFoodTypes: z
      .array(z.enum(['dry', 'fresh', 'prepared', 'frozen', 'beverages']))
      .min(1, 'Au moins un type de nourriture accepté est requis'),
    collectionSchedule: z.object({
      monday: z.object({ open: z.string(), close: z.string() }).optional(),
      tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
      wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
      thursday: z.object({ open: z.string(), close: z.string() }).optional(),
      friday: z.object({ open: z.string(), close: z.string() }).optional(),
      saturday: z.object({ open: z.string(), close: z.string() }).optional(),
      sunday: z.object({ open: z.string(), close: z.string() }).optional(),
    }),
    collectionPoints: z
      .array(
        z.object({
          name: z.string(),
          address: z.string(),
          latitude: z.number(),
          longitude: z.number(),
        })
      )
      .optional(),
    mobileMoney: z.string().optional(),
    bankAccount: z
      .object({
        bankName: z.string(),
        accountNumber: z.string(),
        accountHolder: z.string(),
      })
      .optional(),
  }),
});

export const updateAssociationSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().min(20).max(1000).optional(),
    logo: z.string().url().optional().nullable(),
    address: z.string().min(10).optional(),
    serviceArea: z.array(z.string()).min(1).optional(),
    acceptedFoodTypes: z
      .array(z.enum(['dry', 'fresh', 'prepared', 'frozen', 'beverages']))
      .min(1)
      .optional(),
    collectionSchedule: z
      .object({
        monday: z.object({ open: z.string(), close: z.string() }).optional(),
        tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
        wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
        thursday: z.object({ open: z.string(), close: z.string() }).optional(),
        friday: z.object({ open: z.string(), close: z.string() }).optional(),
        saturday: z.object({ open: z.string(), close: z.string() }).optional(),
        sunday: z.object({ open: z.string(), close: z.string() }).optional(),
      })
      .optional(),
    collectionPoints: z
      .array(
        z.object({
          name: z.string(),
          address: z.string(),
          latitude: z.number(),
          longitude: z.number(),
        })
      )
      .optional()
      .nullable(),
    mobileMoney: z.string().optional().nullable(),
    bankAccount: z
      .object({
        bankName: z.string(),
        accountNumber: z.string(),
        accountHolder: z.string(),
      })
      .optional()
      .nullable(),
  }),
});

export const associationIdParamSchema = z.object({
  params: z.object({
    associationId: z.string().uuid('ID association invalide'),
  }),
});

export const searchAssociationsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    verified: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    acceptedFoodType: z
      .enum(['dry', 'fresh', 'prepared', 'frozen', 'beverages'])
      .optional(),
    latitude: z.string().transform(Number).pipe(z.number()).optional(),
    longitude: z.string().transform(Number).pipe(z.number()).optional(),
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

export const nearbyAssociationsSchema = z.object({
  query: z.object({
    latitude: z.string().transform(Number).pipe(z.number()),
    longitude: z.string().transform(Number).pipe(z.number()),
    radius: z.string().transform(Number).pipe(z.number().positive()).optional(),
    limit: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive().max(50))
      .optional(),
  }),
});

// ==================== REPORT VALIDATORS ====================

export const createReportSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(5, 'Le titre doit avoir au moins 5 caractères')
      .max(200, 'Le titre ne peut pas dépasser 200 caractères'),
    description: z
      .string()
      .min(50, 'La description doit avoir au moins 50 caractères')
      .max(5000, 'La description ne peut pas dépasser 5000 caractères'),
    images: z.array(z.string().url()).optional(),
    donationsUsed: z.array(z.string().uuid()).optional(),
    beneficiaries: z.number().int().positive().optional(),
    impactMetrics: z
      .object({
        mealsServed: z.number().int().positive().optional(),
        familiesHelped: z.number().int().positive().optional(),
        kgFoodDistributed: z.number().positive().optional(),
        customMetrics: z.record(z.string(), z.number()).optional(),
      })
      .optional(),
  }),
});

export const getReportsSchema = z.object({
  params: z.object({
    associationId: z.string().uuid('ID association invalide'),
  }),
  query: z.object({
    page: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive())
      .optional(),
    limit: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive().max(50))
      .optional(),
  }),
});

// ==================== ADMIN VALIDATORS ====================

export const adminVerifyAssociationSchema = z.object({
  params: z.object({
    associationId: z.string().uuid('ID association invalide'),
  }),
});

export const adminRejectAssociationSchema = z.object({
  params: z.object({
    associationId: z.string().uuid('ID association invalide'),
  }),
  body: z.object({
    reason: z
      .string()
      .min(10, 'La raison doit avoir au moins 10 caractères')
      .max(500, 'La raison ne peut pas dépasser 500 caractères'),
  }),
});

export const adminSearchAssociationsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    verified: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
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
export type RegisterAssociationInput = z.infer<
  typeof registerAssociationSchema
>;
export type UpdateAssociationInput = z.infer<typeof updateAssociationSchema>;
export type SearchAssociationsInput = z.infer<typeof searchAssociationsSchema>;
export type NearbyAssociationsInput = z.infer<typeof nearbyAssociationsSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type GetReportsInput = z.infer<typeof getReportsSchema>;
export type AdminRejectAssociationInput = z.infer<
  typeof adminRejectAssociationSchema
>;
