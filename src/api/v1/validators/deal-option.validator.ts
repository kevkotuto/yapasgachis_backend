import { z } from 'zod';

// ==================== DEAL OPTION VALIDATORS ====================

export const createDealOptionSchema = z.object({
  body: z.object({
    dealId: z.string().uuid('Deal ID invalide'),
    title: z.string().min(1, 'Le titre est requis').max(200),
    description: z.string().max(1000).optional(),
    price: z.number().min(0, 'Le prix doit être positif'),
    capacity: z.string().max(100).optional(),
    size: z.string().max(100).optional(),
    floor: z.string().max(100).optional(),
    features: z.array(z.string()).optional(),
    imageUrl: z.string().url('URL invalide').optional(),
    stock: z.number().int().min(0).optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});

export const updateDealOptionSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    price: z.number().min(0, 'Le prix doit être positif').optional(),
    capacity: z.string().max(100).optional(),
    size: z.string().max(100).optional(),
    floor: z.string().max(100).optional(),
    features: z.array(z.string()).optional(),
    imageUrl: z.string().url('URL invalide').optional(),
    stock: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});

export const dealIdParamSchema = z.object({
  params: z.object({
    dealId: z.string().uuid(),
  }),
  query: z.object({
    activeOnly: z.enum(['true', 'false']).optional(),
  }),
});

export const optionIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const checkAvailabilitySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({
    quantity: z.coerce.number().int().min(1).optional().default(1),
  }),
});

export const reorderDealOptionsSchema = z.object({
  params: z.object({
    dealId: z.string().uuid(),
  }),
  body: z.object({
    optionIds: z.array(z.string().uuid()).min(1, 'Au moins une option requise'),
  }),
});

// Types
export type CreateDealOptionInput = z.infer<
  typeof createDealOptionSchema
>['body'];
export type UpdateDealOptionInput = z.infer<
  typeof updateDealOptionSchema
>['body'];
export type ReorderDealOptionsInput = z.infer<
  typeof reorderDealOptionsSchema
>['body'];
