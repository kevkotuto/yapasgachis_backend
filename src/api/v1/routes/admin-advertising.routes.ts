import { Router } from 'express';
import advertisingController from '@/api/v1/controllers/advertising.controller';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';
import {
  getAllCampaignsSchema,
  campaignIdSchema,
  rejectCampaignSchema,
  paginationSchema,
} from '@/api/v1/validators/advertising.validator';

const router: Router = Router();

// All routes require admin authentication
router.use(authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']));

// ==================== ADVERTISER MANAGEMENT ====================

router.get(
  '/advertisers',
  validate(paginationSchema),
  advertisingController.getAllAdvertisers
);

// ==================== CAMPAIGN MANAGEMENT ====================

router.get(
  '/campaigns',
  validate(getAllCampaignsSchema),
  advertisingController.getAllCampaigns
);

router.get(
  '/campaigns/pending',
  validate(paginationSchema),
  advertisingController.getPendingCampaigns
);

router.patch(
  '/campaigns/:id/approve',
  validate(campaignIdSchema),
  advertisingController.approveCampaign
);

router.patch(
  '/campaigns/:id/reject',
  validate(rejectCampaignSchema),
  advertisingController.rejectCampaign
);

export default router;
