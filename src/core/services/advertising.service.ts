import { AdFormat, CampaignStatus, UserRole, NotificationType, NotificationPriority } from '@prisma/client';

import advertiserRepository from '@/core/repositories/advertiser.repository';
import analyticsService from '@/core/services/analytics.service';
import notificationService from '@/core/services/notification.service';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/utils/helpers';

/**
 * Advertising Service
 * Business logic for advertising campaigns and advertiser management
 */
export class AdvertisingService {
  // ==================== ADVERTISER PROFILE ====================

  /**
   * Create advertiser profile
   */
  async createProfile(
    userId: string,
    data: {
      companyName: string;
      logo?: string;
    }
  ) {
    // Check if user already has an advertiser profile
    const existing = await advertiserRepository.findProfileByUserId(userId);
    if (existing) {
      throw new AppError(400, 'Vous avez déjà un profil annonceur');
    }

    // Update user role
    await prisma.user.update({
      where: { id: userId },
      data: { role: UserRole.ADVERTISER },
    });

    const profile = await advertiserRepository.createProfile(userId, data);

    logger.info('Advertiser profile created', {
      userId,
      profileId: profile.id,
    });

    return profile;
  }

  /**
   * Get advertiser profile
   */
  async getProfile(userId: string) {
    const profile = await advertiserRepository.findProfileByUserId(userId);

    if (!profile) {
      throw new AppError(404, 'Profil annonceur non trouvé');
    }

    return profile;
  }

  /**
   * Get advertiser profile by ID
   */
  async getProfileById(id: string) {
    const profile = await advertiserRepository.findProfileById(id);

    if (!profile) {
      throw new AppError(404, 'Profil annonceur non trouvé');
    }

    return profile;
  }

  /**
   * Update advertiser profile
   */
  async updateProfile(
    userId: string,
    data: {
      companyName?: string;
      logo?: string;
    }
  ) {
    const profile = await advertiserRepository.findProfileByUserId(userId);

    if (!profile) {
      throw new AppError(404, 'Profil annonceur non trouvé');
    }

    const updatedProfile = await advertiserRepository.updateProfile(
      profile.id,
      data
    );

    logger.info('Advertiser profile updated', {
      userId,
      profileId: profile.id,
    });

    return updatedProfile;
  }

  /**
   * Get all advertisers (admin)
   */
  async getAllAdvertisers(page = 1, limit = 20) {
    const result = await advertiserRepository.getAllProfiles(page, limit);

    return {
      ...result,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  // ==================== CAMPAIGNS ====================

  /**
   * Create a campaign
   */
  async createCampaign(
    userId: string,
    data: {
      name: string;
      format: AdFormat;
      imageUrl: string;
      title: string;
      description?: string;
      ctaText?: string;
      targetUrl?: string;
      targetCities?: string[];
      targetCategories?: string[];
      targetAgeRange?: { min: number; max: number };
      budget: number;
      costModel?: string;
      bidAmount: number;
      startDate: Date;
      endDate: Date;
    }
  ) {
    const profile = await advertiserRepository.findProfileByUserId(userId);

    if (!profile) {
      throw new AppError(404, 'Profil annonceur non trouvé');
    }

    // Validate dates
    const now = new Date();
    if (new Date(data.startDate) < now) {
      throw new AppError(400, 'La date de début doit être dans le futur');
    }

    if (new Date(data.endDate) <= new Date(data.startDate)) {
      throw new AppError(
        400,
        'La date de fin doit être après la date de début'
      );
    }

    // Validate budget
    if (data.budget < 10000) {
      throw new AppError(400, 'Le budget minimum est de 10 000 XOF');
    }

    // Validate bid amount
    if (data.bidAmount < 100) {
      throw new AppError(400, "L'enchère minimum est de 100 XOF");
    }

    const campaign = await advertiserRepository.createCampaign(profile.id, {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    });

    logger.info('Campaign created', {
      userId,
      campaignId: campaign.id,
      advertiserId: profile.id,
    });

    return campaign;
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string, userId?: string) {
    const campaign = await advertiserRepository.findCampaignById(campaignId);

    if (!campaign) {
      throw new AppError(404, 'Campagne non trouvée');
    }

    // If userId is provided, check ownership (unless admin)
    if (userId) {
      const profile = await advertiserRepository.findProfileByUserId(userId);
      if (profile && campaign.advertiserId !== profile.id) {
        throw new AppError(
          403,
          "Vous n'êtes pas autorisé à voir cette campagne"
        );
      }
    }

    return campaign;
  }

  /**
   * Get campaigns for current advertiser
   */
  async getMyCampaigns(
    userId: string,
    options: {
      status?: CampaignStatus;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const profile = await advertiserRepository.findProfileByUserId(userId);

    if (!profile) {
      throw new AppError(404, 'Profil annonceur non trouvé');
    }

    const result = await advertiserRepository.getCampaignsByAdvertiser(
      profile.id,
      options
    );

    return {
      ...result,
      pagination: {
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: Math.ceil(result.total / (options.limit || 20)),
      },
    };
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    userId: string,
    campaignId: string,
    data: {
      name?: string;
      imageUrl?: string;
      title?: string;
      description?: string;
      ctaText?: string;
      targetUrl?: string;
      targetCities?: string[];
      targetCategories?: string[];
      budget?: number;
      bidAmount?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const profile = await advertiserRepository.findProfileByUserId(userId);
    const campaign = await advertiserRepository.findCampaignById(campaignId);

    if (!campaign) {
      throw new AppError(404, 'Campagne non trouvée');
    }

    if (!profile || campaign.advertiserId !== profile.id) {
      throw new AppError(
        403,
        "Vous n'êtes pas autorisé à modifier cette campagne"
      );
    }

    // Can only update DRAFT or PAUSED campaigns
    if (!['DRAFT', 'PAUSED'].includes(campaign.status)) {
      throw new AppError(
        400,
        'Seules les campagnes en brouillon ou en pause peuvent être modifiées'
      );
    }

    const updatedCampaign = await advertiserRepository.updateCampaign(
      campaignId,
      data
    );

    logger.info('Campaign updated', {
      userId,
      campaignId,
    });

    return updatedCampaign;
  }

  /**
   * Submit campaign for approval
   */
  async submitCampaignForApproval(userId: string, campaignId: string) {
    const profile = await advertiserRepository.findProfileByUserId(userId);
    const campaign = await advertiserRepository.findCampaignById(campaignId);

    if (!campaign) {
      throw new AppError(404, 'Campagne non trouvée');
    }

    if (!profile || campaign.advertiserId !== profile.id) {
      throw new AppError(
        403,
        "Vous n'êtes pas autorisé à soumettre cette campagne"
      );
    }

    if (campaign.status !== 'DRAFT') {
      throw new AppError(
        400,
        'Seules les campagnes en brouillon peuvent être soumises'
      );
    }

    const updatedCampaign = await advertiserRepository.updateCampaignStatus(
      campaignId,
      'PENDING_APPROVAL'
    );

    logger.info('Campaign submitted for approval', {
      userId,
      campaignId,
    });

    return updatedCampaign;
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(userId: string, campaignId: string) {
    const profile = await advertiserRepository.findProfileByUserId(userId);
    const campaign = await advertiserRepository.findCampaignById(campaignId);

    if (!campaign) {
      throw new AppError(404, 'Campagne non trouvée');
    }

    if (!profile || campaign.advertiserId !== profile.id) {
      throw new AppError(
        403,
        "Vous n'êtes pas autorisé à mettre cette campagne en pause"
      );
    }

    if (campaign.status !== 'ACTIVE') {
      throw new AppError(
        400,
        'Seules les campagnes actives peuvent être mises en pause'
      );
    }

    const updatedCampaign = await advertiserRepository.updateCampaignStatus(
      campaignId,
      'PAUSED'
    );

    logger.info('Campaign paused', {
      userId,
      campaignId,
    });

    return updatedCampaign;
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(userId: string, campaignId: string) {
    const profile = await advertiserRepository.findProfileByUserId(userId);
    const campaign = await advertiserRepository.findCampaignById(campaignId);

    if (!campaign) {
      throw new AppError(404, 'Campagne non trouvée');
    }

    if (!profile || campaign.advertiserId !== profile.id) {
      throw new AppError(
        403,
        "Vous n'êtes pas autorisé à reprendre cette campagne"
      );
    }

    if (campaign.status !== 'PAUSED') {
      throw new AppError(
        400,
        'Seules les campagnes en pause peuvent être reprises'
      );
    }

    // Check if campaign is still within date range
    const now = new Date();
    if (now >= campaign.endDate) {
      throw new AppError(
        400,
        'Cette campagne a expiré et ne peut pas être reprise'
      );
    }

    // Check if budget is exhausted
    if (campaign.spent >= campaign.budget) {
      throw new AppError(400, 'Le budget de cette campagne est épuisé');
    }

    const updatedCampaign = await advertiserRepository.updateCampaignStatus(
      campaignId,
      'ACTIVE'
    );

    logger.info('Campaign resumed', {
      userId,
      campaignId,
    });

    return updatedCampaign;
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(userId: string, campaignId: string) {
    const profile = await advertiserRepository.findProfileByUserId(userId);
    const campaign = await advertiserRepository.findCampaignById(campaignId);

    if (!campaign) {
      throw new AppError(404, 'Campagne non trouvée');
    }

    if (!profile || campaign.advertiserId !== profile.id) {
      throw new AppError(
        403,
        "Vous n'êtes pas autorisé à supprimer cette campagne"
      );
    }

    // Can only delete DRAFT or REJECTED campaigns
    if (!['DRAFT', 'REJECTED'].includes(campaign.status)) {
      throw new AppError(
        400,
        'Seules les campagnes en brouillon ou rejetées peuvent être supprimées'
      );
    }

    await advertiserRepository.deleteCampaign(campaignId);

    logger.info('Campaign deleted', {
      userId,
      campaignId,
    });

    return { success: true };
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(userId: string, campaignId: string) {
    const profile = await advertiserRepository.findProfileByUserId(userId);
    const campaign = await advertiserRepository.findCampaignById(campaignId);

    if (!campaign) {
      throw new AppError(404, 'Campagne non trouvée');
    }

    if (!profile || campaign.advertiserId !== profile.id) {
      throw new AppError(
        403,
        "Vous n'êtes pas autorisé à voir les statistiques de cette campagne"
      );
    }

    return await advertiserRepository.getCampaignStats(campaignId);
  }

  // ==================== ADMIN FUNCTIONS ====================

  /**
   * Get pending campaigns (admin)
   */
  async getPendingCampaigns(page = 1, limit = 20) {
    const result = await advertiserRepository.getPendingCampaigns(page, limit);

    return {
      ...result,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  /**
   * Approve campaign (admin)
   */
  async approveCampaign(campaignId: string, adminId: string) {
    const campaign = await advertiserRepository.findCampaignById(campaignId);

    if (!campaign) {
      throw new AppError(404, 'Campagne non trouvée');
    }

    if (campaign.status !== 'PENDING_APPROVAL') {
      throw new AppError(
        400,
        'Seules les campagnes en attente peuvent être approuvées'
      );
    }

    // Check if start date is in the future
    const now = new Date();
    const status =
      campaign.startDate <= now ? CampaignStatus.ACTIVE : CampaignStatus.ACTIVE;

    const updatedCampaign = await advertiserRepository.updateCampaignStatus(
      campaignId,
      status
    );

    logger.info('Campaign approved', {
      campaignId,
      adminId,
    });

    // Send notification to advertiser
    const advertiser = await prisma.advertiserProfile.findUnique({
      where: { id: campaign.advertiserId },
      select: { userId: true },
    });

    if (advertiser) {
      await notificationService.create({
        userId: advertiser.userId,
        type: NotificationType.SYSTEM,
        title: 'Campagne approuvée',
        message: `Votre campagne publicitaire "${campaign.name}" a été approuvée et est maintenant active.`,
        priority: NotificationPriority.NORMAL,
        sendPush: true,
        sendEmail: true,
        data: { campaignId, type: 'campaign_approved' },
      });
    }

    return updatedCampaign;
  }

  /**
   * Reject campaign (admin)
   */
  async rejectCampaign(campaignId: string, adminId: string, reason: string) {
    const campaign = await advertiserRepository.findCampaignById(campaignId);

    if (!campaign) {
      throw new AppError(404, 'Campagne non trouvée');
    }

    if (campaign.status !== 'PENDING_APPROVAL') {
      throw new AppError(
        400,
        'Seules les campagnes en attente peuvent être rejetées'
      );
    }

    const updatedCampaign = await advertiserRepository.updateCampaign(
      campaignId,
      {
        status: 'REJECTED',
        // Store rejection reason in metadata or a separate field
      }
    );

    logger.info('Campaign rejected', {
      campaignId,
      adminId,
      reason,
    });

    // Send notification to advertiser
    const advertiser = await prisma.advertiserProfile.findUnique({
      where: { id: campaign.advertiserId },
      select: { userId: true },
    });

    if (advertiser) {
      await notificationService.create({
        userId: advertiser.userId,
        type: NotificationType.SYSTEM,
        title: 'Campagne refusée',
        message: `Votre campagne publicitaire "${campaign.name}" a été refusée. Raison: ${reason}`,
        priority: NotificationPriority.HIGH,
        sendPush: true,
        sendEmail: true,
        data: { campaignId, type: 'campaign_rejected', reason },
      });
    }

    return updatedCampaign;
  }

  /**
   * Get all campaigns (admin)
   */
  async getAllCampaigns(options: {
    status?: CampaignStatus;
    format?: AdFormat;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const result = await advertiserRepository.getAllCampaigns(options);

    return {
      ...result,
      pagination: {
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: Math.ceil(result.total / (options.limit || 20)),
      },
    };
  }

  // ==================== AD SERVING ====================

  /**
   * Get ads to display
   */
  async getAdsToDisplay(options: {
    format?: AdFormat;
    city?: string;
    category?: string;
    limit?: number;
  }) {
    const campaigns = await advertiserRepository.getActiveCampaigns(options);

    // Track impressions
    for (const campaign of campaigns) {
      await advertiserRepository.incrementImpressions(campaign.id);

      // Update spent based on CPM
      if (campaign.costModel === 'CPM') {
        const cost = campaign.bidAmount / 1000;
        await advertiserRepository.updateSpentAmount(campaign.id, cost);
      }
    }

    // Return formatted ads
    return campaigns.map((campaign) => ({
      id: campaign.id,
      format: campaign.format,
      imageUrl: campaign.imageUrl,
      title: campaign.title,
      description: campaign.description,
      ctaText: campaign.ctaText,
      targetUrl: campaign.targetUrl,
      advertiserId: campaign.advertiserId,
    }));
  }

  /**
   * Track ad click
   */
  async trackAdClick(campaignId: string, userId?: string) {
    const campaign = await advertiserRepository.findCampaignById(campaignId);

    if (!campaign || campaign.status !== 'ACTIVE') {
      return;
    }

    await advertiserRepository.incrementClicks(campaignId);

    // Update spent based on CPC
    if (campaign.costModel === 'CPC') {
      await advertiserRepository.updateSpentAmount(
        campaignId,
        campaign.bidAmount
      );
    }

    // Track analytics event
    await analyticsService.trackEvent({
      userId,
      eventType: 'ad_click',
      eventData: {
        campaignId,
        advertiserId: campaign.advertiserId,
      },
    });

    logger.info('Ad click tracked', {
      campaignId,
      userId,
    });
  }

  /**
   * Track ad conversion
   */
  async trackAdConversion(campaignId: string, userId?: string) {
    const campaign = await advertiserRepository.findCampaignById(campaignId);

    if (!campaign) {
      return;
    }

    await advertiserRepository.incrementConversions(campaignId);

    // Track analytics event
    await analyticsService.trackEvent({
      userId,
      eventType: 'ad_conversion',
      eventData: {
        campaignId,
        advertiserId: campaign.advertiserId,
      },
    });

    logger.info('Ad conversion tracked', {
      campaignId,
      userId,
    });
  }

  // ==================== CRON JOBS ====================

  /**
   * Process expired and exhausted campaigns (cron)
   */
  async processExpiredCampaigns() {
    // Get campaigns that have ended
    const endedCampaigns = await advertiserRepository.getEndedCampaigns();
    for (const campaign of endedCampaigns) {
      await advertiserRepository.updateCampaignStatus(
        campaign.id,
        CampaignStatus.COMPLETED
      );
      logger.info('Campaign marked as completed (ended)', {
        campaignId: campaign.id,
      });
    }

    // Get campaigns that have exhausted budget
    const exhaustedCampaigns =
      await advertiserRepository.getExhaustedBudgetCampaigns();
    for (const campaign of exhaustedCampaigns) {
      await advertiserRepository.updateCampaignStatus(
        campaign.id,
        CampaignStatus.COMPLETED
      );
      logger.info('Campaign marked as completed (budget exhausted)', {
        campaignId: campaign.id,
      });
    }

    return {
      ended: endedCampaigns.length,
      exhausted: exhaustedCampaigns.length,
    };
  }
}

export default new AdvertisingService();
