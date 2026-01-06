import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/helpers';
import advertisingService from '@/core/services/advertising.service';
import {
  CreateAdvertiserProfileInput,
  UpdateAdvertiserProfileInput,
  CreateCampaignInput,
  UpdateCampaignInput,
  GetCampaignsQuery,
  GetAllCampaignsQuery,
  RejectCampaignInput,
  GetAdsQuery,
} from '../validators/advertising.validator';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Advertising Controller
 * Handles advertising-related HTTP requests
 */
export class AdvertisingController {
  // ==================== ADVERTISER PROFILE ====================

  /**
   * Create advertiser profile
   * POST /api/v1/advertising/profile
   */
  createProfile = asyncHandler(
    async (
      req: Request<{}, {}, CreateAdvertiserProfileInput>,
      res: Response
    ) => {
      const userId = req.user!.id;

      const profile = await advertisingService.createProfile(userId, req.body);

      logger.info('Advertiser profile created via API', {
        userId,
        profileId: profile.id,
      });

      res.status(201).json({
        success: true,
        message: 'Profil annonceur créé avec succès',
        data: { profile },
      });
    }
  );

  /**
   * Get my advertiser profile
   * GET /api/v1/advertising/profile
   */
  getMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const profile = await advertisingService.getProfile(userId);

    res.json({
      success: true,
      data: { profile },
    });
  });

  /**
   * Update advertiser profile
   * PUT /api/v1/advertising/profile
   */
  updateProfile = asyncHandler(
    async (
      req: Request<{}, {}, UpdateAdvertiserProfileInput>,
      res: Response
    ) => {
      const userId = req.user!.id;

      const profile = await advertisingService.updateProfile(userId, req.body);

      logger.info('Advertiser profile updated via API', {
        userId,
        profileId: profile.id,
      });

      res.json({
        success: true,
        message: 'Profil annonceur mis à jour',
        data: { profile },
      });
    }
  );

  // ==================== CAMPAIGNS ====================

  /**
   * Create campaign
   * POST /api/v1/advertising/campaigns
   */
  createCampaign = asyncHandler(
    async (req: Request<{}, {}, CreateCampaignInput>, res: Response) => {
      const userId = req.user!.id;

      const campaign = await advertisingService.createCampaign(userId, req.body);

      logger.info('Campaign created via API', {
        userId,
        campaignId: campaign.id,
      });

      res.status(201).json({
        success: true,
        message: 'Campagne créée avec succès',
        data: { campaign },
      });
    }
  );

  /**
   * Get my campaigns
   * GET /api/v1/advertising/campaigns
   */
  getMyCampaigns = asyncHandler(
    async (req: Request<{}, {}, {}, GetCampaignsQuery>, res: Response) => {
      const userId = req.user!.id;

      const result = await advertisingService.getMyCampaigns(userId, req.query);

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Get campaign by ID
   * GET /api/v1/advertising/campaigns/:id
   */
  getCampaign = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const userId = req.user!.id;
      const { id } = req.params;

      const campaign = await advertisingService.getCampaign(id, userId);

      res.json({
        success: true,
        data: { campaign },
      });
    }
  );

  /**
   * Update campaign
   * PUT /api/v1/advertising/campaigns/:id
   */
  updateCampaign = asyncHandler(
    async (
      req: Request<{ id: string }, {}, UpdateCampaignInput>,
      res: Response
    ) => {
      const userId = req.user!.id;
      const { id } = req.params;

      const campaign = await advertisingService.updateCampaign(
        userId,
        id,
        req.body
      );

      logger.info('Campaign updated via API', {
        userId,
        campaignId: id,
      });

      res.json({
        success: true,
        message: 'Campagne mise à jour',
        data: { campaign },
      });
    }
  );

  /**
   * Submit campaign for approval
   * POST /api/v1/advertising/campaigns/:id/submit
   */
  submitCampaign = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const userId = req.user!.id;
      const { id } = req.params;

      const campaign = await advertisingService.submitCampaignForApproval(
        userId,
        id
      );

      logger.info('Campaign submitted for approval via API', {
        userId,
        campaignId: id,
      });

      res.json({
        success: true,
        message: 'Campagne soumise pour approbation',
        data: { campaign },
      });
    }
  );

  /**
   * Pause campaign
   * POST /api/v1/advertising/campaigns/:id/pause
   */
  pauseCampaign = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const userId = req.user!.id;
      const { id } = req.params;

      const campaign = await advertisingService.pauseCampaign(userId, id);

      logger.info('Campaign paused via API', {
        userId,
        campaignId: id,
      });

      res.json({
        success: true,
        message: 'Campagne mise en pause',
        data: { campaign },
      });
    }
  );

  /**
   * Resume campaign
   * POST /api/v1/advertising/campaigns/:id/resume
   */
  resumeCampaign = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const userId = req.user!.id;
      const { id } = req.params;

      const campaign = await advertisingService.resumeCampaign(userId, id);

      logger.info('Campaign resumed via API', {
        userId,
        campaignId: id,
      });

      res.json({
        success: true,
        message: 'Campagne reprise',
        data: { campaign },
      });
    }
  );

  /**
   * Delete campaign
   * DELETE /api/v1/advertising/campaigns/:id
   */
  deleteCampaign = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const userId = req.user!.id;
      const { id } = req.params;

      await advertisingService.deleteCampaign(userId, id);

      logger.info('Campaign deleted via API', {
        userId,
        campaignId: id,
      });

      res.json({
        success: true,
        message: 'Campagne supprimée',
      });
    }
  );

  /**
   * Get campaign statistics
   * GET /api/v1/advertising/campaigns/:id/stats
   */
  getCampaignStats = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const userId = req.user!.id;
      const { id } = req.params;

      const stats = await advertisingService.getCampaignStats(userId, id);

      res.json({
        success: true,
        data: { stats },
      });
    }
  );

  // ==================== AD SERVING (PUBLIC) ====================

  /**
   * Get ads to display
   * GET /api/v1/ads
   */
  getAds = asyncHandler(
    async (req: Request<{}, {}, {}, GetAdsQuery>, res: Response) => {
      const ads = await advertisingService.getAdsToDisplay(req.query);

      res.json({
        success: true,
        data: { ads },
      });
    }
  );

  /**
   * Track ad click
   * POST /api/v1/ads/:id/click
   */
  trackClick = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const { id } = req.params;
      const userId = req.user?.id;

      await advertisingService.trackAdClick(id, userId);

      res.json({
        success: true,
      });
    }
  );

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get all advertisers (admin)
   * GET /api/v1/admin/advertising/advertisers
   */
  getAllAdvertisers = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as { page?: number; limit?: number };

    const result = await advertisingService.getAllAdvertisers(
      page || 1,
      limit || 20
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Get all campaigns (admin)
   * GET /api/v1/admin/advertising/campaigns
   */
  getAllCampaigns = asyncHandler(
    async (req: Request<{}, {}, {}, GetAllCampaignsQuery>, res: Response) => {
      const result = await advertisingService.getAllCampaigns(req.query);

      res.json({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Get pending campaigns (admin)
   * GET /api/v1/admin/advertising/campaigns/pending
   */
  getPendingCampaigns = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as { page?: number; limit?: number };

    const result = await advertisingService.getPendingCampaigns(
      page || 1,
      limit || 20
    );

    res.json({
      success: true,
      data: result,
    });
  });

  /**
   * Approve campaign (admin)
   * PATCH /api/v1/admin/advertising/campaigns/:id/approve
   */
  approveCampaign = asyncHandler(
    async (req: Request<{ id: string }>, res: Response) => {
      const adminId = req.user!.id;
      const { id } = req.params;

      const campaign = await advertisingService.approveCampaign(id, adminId);

      logger.info('Campaign approved by admin', {
        campaignId: id,
        adminId,
      });

      res.json({
        success: true,
        message: 'Campagne approuvée',
        data: { campaign },
      });
    }
  );

  /**
   * Reject campaign (admin)
   * PATCH /api/v1/admin/advertising/campaigns/:id/reject
   */
  rejectCampaign = asyncHandler(
    async (
      req: Request<{ id: string }, {}, RejectCampaignInput>,
      res: Response
    ) => {
      const adminId = req.user!.id;
      const { id } = req.params;
      const { reason } = req.body;

      const campaign = await advertisingService.rejectCampaign(
        id,
        adminId,
        reason
      );

      logger.info('Campaign rejected by admin', {
        campaignId: id,
        reason,
        adminId,
      });

      res.json({
        success: true,
        message: 'Campagne rejetée',
        data: { campaign },
      });
    }
  );
}

export default new AdvertisingController();
