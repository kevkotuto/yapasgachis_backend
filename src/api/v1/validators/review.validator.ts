import { z } from 'zod';

// ==================== REVIEW VALIDATORS ====================

export const createReviewSchema = z.object({
  body: z.object({
    productId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    rating: z.number().min(1).max(5),
    comment: z.string().max(1000).optional(),
    images: z.array(z.string().url()).max(5).optional(),
  }).refine(
    (data) => data.productId || data.orderId,
    { message: 'Un productId ou orderId est requis' }
  ),
});

export const updateReviewSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().max(1000).optional(),
    images: z.array(z.string().url()).max(5).optional(),
  }),
});

export const getProductReviewsSchema = z.object({
  params: z.object({
    productId: z.string().uuid(),
  }),
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(10),
    minRating: z.coerce.number().min(1).max(5).optional(),
    sortBy: z.enum(['recent', 'helpful', 'rating_high', 'rating_low']).optional().default('recent'),
  }),
});

export const getSupplierReviewsSchema = z.object({
  params: z.object({
    supplierId: z.string().uuid(),
  }),
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(10),
  }),
});

export const reviewIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const reportReviewSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
  }),
});

// Types
export type CreateReviewInput = z.infer<typeof createReviewSchema>['body'];
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>['body'];
export type GetProductReviewsQuery = z.infer<typeof getProductReviewsSchema>['query'];
export type GetSupplierReviewsQuery = z.infer<typeof getSupplierReviewsSchema>['query'];
