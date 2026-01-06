import { Router } from 'express';

import advertisingController from '@/api/v1/controllers/advertising.controller';
import {
  createAdvertiserProfileSchema,
  updateAdvertiserProfileSchema,
  createCampaignSchema,
  updateCampaignSchema,
  campaignIdSchema,
  getCampaignsSchema,
  getAdsSchema,
  trackAdClickSchema,
} from '@/api/v1/validators/advertising.validator';
import { authenticate, optionalAuth } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== PUBLIC ROUTES (AD SERVING) ====================

// Get ads to display
router.get('/ads', validate(getAdsSchema), advertisingController.getAds);

// Track ad click
router.post(
  '/ads/:id/click',
  optionalAuth,
  validate(trackAdClickSchema),
  advertisingController.trackClick
);

// ==================== AUTHENTICATED ROUTES ====================

// Profile management
router.post(
  '/profile',
  authenticate,
  validate(createAdvertiserProfileSchema),
  advertisingController.createProfile
);

router.get('/profile', authenticate, advertisingController.getMyProfile);

router.put(
  '/profile',
  authenticate,
  validate(updateAdvertiserProfileSchema),
  advertisingController.updateProfile
);

// Campaign management
router.post(
  '/campaigns',
  authenticate,
  requireRole(['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']),
  validate(createCampaignSchema),
  advertisingController.createCampaign
);

router.get(
  '/campaigns',
  authenticate,
  requireRole(['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']),
  validate(getCampaignsSchema),
  advertisingController.getMyCampaigns
);

router.get(
  '/campaigns/:id',
  authenticate,
  requireRole(['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']),
  validate(campaignIdSchema),
  advertisingController.getCampaign
);

router.put(
  '/campaigns/:id',
  authenticate,
  requireRole(['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']),
  validate(updateCampaignSchema),
  advertisingController.updateCampaign
);

router.post(
  '/campaigns/:id/submit',
  authenticate,
  requireRole(['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']),
  validate(campaignIdSchema),
  advertisingController.submitCampaign
);

router.post(
  '/campaigns/:id/pause',
  authenticate,
  requireRole(['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']),
  validate(campaignIdSchema),
  advertisingController.pauseCampaign
);

router.post(
  '/campaigns/:id/resume',
  authenticate,
  requireRole(['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']),
  validate(campaignIdSchema),
  advertisingController.resumeCampaign
);

router.delete(
  '/campaigns/:id',
  authenticate,
  requireRole(['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']),
  validate(campaignIdSchema),
  advertisingController.deleteCampaign
);

router.get(
  '/campaigns/:id/stats',
  authenticate,
  requireRole(['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']),
  validate(campaignIdSchema),
  advertisingController.getCampaignStats
);

export default router;
