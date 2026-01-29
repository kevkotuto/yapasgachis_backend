import { ProductCategory } from '@prisma/client';
import { z } from 'zod';

/**
 * Map Validators
 * Zod schemas for map-related requests
 */

// Get markers query schema
export const getMarkersSchema = z.object({
  query: z.object({
    // Category filter (optional)
    category: z
      .string()
      .optional()
      .describe('Filter by product category or STORE'),

    // Type filter (optional) - can be comma-separated for multiple types
    type: z
      .string()
      .optional()
      .describe(
        'Filter by marker type (product, deal, donation, store) - comma-separated for multiple'
      ),

    // Map bounds (all or none)
    ne_lat: z.string().optional().describe('Northeast corner latitude'),

    ne_lng: z.string().optional().describe('Northeast corner longitude'),

    sw_lat: z.string().optional().describe('Southwest corner latitude'),

    sw_lng: z.string().optional().describe('Southwest corner longitude'),
  }),
});

export type GetMarkersInput = z.infer<typeof getMarkersSchema>['query'];
