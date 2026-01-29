import { z } from 'zod';

/**
 * Save search validator
 */
export const saveSearchSchema = z.object({
  body: z.object({
    query: z.string().min(1).max(255),
    type: z.enum(['product', 'deal', 'donation', 'all']),
    filters: z.record(z.any()).optional(),
    resultCount: z.number().int().min(0).optional(),
    clicked: z.boolean().optional(),
  }),
});

export type SaveSearchInput = z.infer<typeof saveSearchSchema>['body'];

/**
 * Get recent searches validator
 */
export const getRecentSearchesSchema = z.object({
  query: z.object({
    type: z.enum(['product', 'deal', 'donation', 'all']).optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(50))
      .optional()
      .default('10'),
  }),
});

export type GetRecentSearchesInput = z.infer<
  typeof getRecentSearchesSchema
>['query'];

/**
 * Get search suggestions validator
 */
export const getSearchSuggestionsSchema = z.object({
  query: z.object({
    q: z.string().min(2).max(255), // Minimum 2 characters for suggestions
    type: z.enum(['product', 'deal', 'donation', 'all']).optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(20))
      .optional()
      .default('5'),
  }),
});

export type GetSearchSuggestionsInput = z.infer<
  typeof getSearchSuggestionsSchema
>['query'];

/**
 * Get trending searches validator
 */
export const getTrendingSearchesSchema = z.object({
  query: z.object({
    type: z.enum(['product', 'deal', 'donation', 'all']).optional(),
    timeRange: z.enum(['24h', '7d', '30d']).optional().default('7d'),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(50))
      .optional()
      .default('10'),
  }),
});

export type GetTrendingSearchesInput = z.infer<
  typeof getTrendingSearchesSchema
>['query'];

/**
 * Delete search history validator
 */
export const deleteSearchHistorySchema = z.object({
  params: z
    .object({
      searchId: z.string().uuid().optional(),
    })
    .optional(),
});

export type DeleteSearchHistoryInput = z.infer<
  typeof deleteSearchHistorySchema
>['params'];

/**
 * Mark search as clicked validator
 */
export const markSearchClickedSchema = z.object({
  params: z.object({
    searchId: z.string().uuid(),
  }),
});

export type MarkSearchClickedInput = z.infer<
  typeof markSearchClickedSchema
>['params'];

/**
 * Global search validator
 */
export const globalSearchSchema = z.object({
  query: z.object({
    q: z.string().min(1).max(255),
    types: z.string().optional(), // Comma-separated: "product,deal,donation"
    categories: z.string().optional(), // Comma-separated categories
    latitude: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().min(-90).max(90))
      .optional(),
    longitude: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().min(-180).max(180))
      .optional(),
    radius: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(100))
      .optional()
      .default('20'),
  }),
});

export type GlobalSearchInput = z.infer<typeof globalSearchSchema>['query'];
