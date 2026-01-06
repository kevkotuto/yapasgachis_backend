import { z } from 'zod';
import { AdFormat, CampaignStatus } from '@prisma/client';

// ==================== ADVERTISER PROFILE VALIDATORS ====================

export const createAdvertiserProfileSchema = z.object({
  body: z.object({
    companyName: z.string().min(2).max(200),
    logo: z.string().url().optional(),
  }),
});

export const updateAdvertiserProfileSchema = z.object({
  body: z.object({
    companyName: z.string().min(2).max(200).optional(),
    logo: z.string().url().optional(),
  }),
});

// ==================== CAMPAIGN VALIDATORS ====================

export const createCampaignSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(200),
    format: z.nativeEnum(AdFormat),
    imageUrl: z.string().url(),
    title: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    ctaText: z.string().max(50).optional(),
    targetUrl: z.string().url().optional(),
    targetCities: z.array(z.string()).optional(),
    targetCategories: z.array(z.string()).optional(),
    targetAgeRange: z.object({
      min: z.number().min(13).max(100),
      max: z.number().min(13).max(100),
    }).optional(),
    budget: z.number().min(10000), // Minimum 10,000 XOF
    costModel: z.enum(['CPM', 'CPC']).optional().default('CPM'),
    bidAmount: z.number().min(100), // Minimum 100 XOF
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }).refine(
    (data) => new Date(data.startDate) < new Date(data.endDate),
    { message: 'La date de début doit être antérieure à la date de fin' }
  ).refine(
    (data) => !data.targetAgeRange || data.targetAgeRange.min <= data.targetAgeRange.max,
    { message: "L'âge minimum doit être inférieur ou égal à l'âge maximum" }
  ),
});

export const updateCampaignSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(2).max(200).optional(),
    imageUrl: z.string().url().optional(),
    title: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    ctaText: z.string().max(50).optional(),
    targetUrl: z.string().url().optional(),
    targetCities: z.array(z.string()).optional(),
    targetCategories: z.array(z.string()).optional(),
    budget: z.number().min(10000).optional(),
    bidAmount: z.number().min(100).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
});

export const campaignIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getCampaignsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(CampaignStatus).optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
  }),
});

export const getAllCampaignsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(CampaignStatus).optional(),
    format: z.nativeEnum(AdFormat).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
  }),
});

export const rejectCampaignSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    reason: z.string().min(10).max(500),
  }),
});

// ==================== AD SERVING VALIDATORS ====================

export const getAdsSchema = z.object({
  query: z.object({
    format: z.nativeEnum(AdFormat).optional(),
    city: z.string().optional(),
    category: z.string().optional(),
    limit: z.coerce.number().min(1).max(10).optional().default(5),
  }),
});

export const trackAdClickSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
  }),
});

// Types
export type CreateAdvertiserProfileInput = z.infer<typeof createAdvertiserProfileSchema>['body'];
export type UpdateAdvertiserProfileInput = z.infer<typeof updateAdvertiserProfileSchema>['body'];
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>['body'];
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>['body'];
export type GetCampaignsQuery = z.infer<typeof getCampaignsSchema>['query'];
export type GetAllCampaignsQuery = z.infer<typeof getAllCampaignsSchema>['query'];
export type RejectCampaignInput = z.infer<typeof rejectCampaignSchema>['body'];
export type GetAdsQuery = z.infer<typeof getAdsSchema>['query'];
