import { z } from 'zod';

export const uploadMediaSchema = z.object({
  body: z.object({
    entityType: z.enum([
      'PRODUCT',
      'DEAL',
      'STORE',
      'PROFILE',
      'REVIEW',
      'KYC',
    ]),
    entityId: z.string().uuid(),
    isPrimary: z.string().optional(),
    caption: z.string().max(200).optional(),
    altText: z.string().max(200).optional(),
  }),
});

export const getGallerySchema = z.object({
  params: z.object({
    entityType: z.enum([
      'PRODUCT',
      'DEAL',
      'STORE',
      'PROFILE',
      'REVIEW',
      'KYC',
    ]),
    entityId: z.string().uuid(),
  }),
});

export const updateMediaSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    isPrimary: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
    caption: z.string().max(200).optional(),
    altText: z.string().max(200).optional(),
  }),
});

export const mediaIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const bulkDeleteSchema = z.object({
  body: z.object({
    mediaIds: z.array(z.string().uuid()).min(1),
  }),
});

export const reorderMediaSchema = z.object({
  params: z.object({
    entityType: z.enum([
      'PRODUCT',
      'DEAL',
      'STORE',
      'PROFILE',
      'REVIEW',
      'KYC',
    ]),
    entityId: z.string().uuid(),
  }),
  body: z.object({
    mediaIds: z.array(z.string().uuid()).min(1),
  }),
});

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>['body'];
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>['body'];
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>['body'];
export type ReorderMediaInput = z.infer<typeof reorderMediaSchema>['body'];
