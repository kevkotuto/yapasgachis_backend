import {
  AdvertiserProfile,
  AdCampaign,
  CampaignStatus,
  AdFormat,
  Prisma,
} from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Advertiser Repository
 * Data access layer for advertiser profiles and campaigns
 */
export class AdvertiserRepository {
  // ==================== ADVERTISER PROFILES ====================

  /**
   * Create an advertiser profile
   */
  async createProfile(
    userId: string,
    data: {
      companyName: string;
      logo?: string;
    }
  ): Promise<AdvertiserProfile> {
    try {
      return await prisma.advertiserProfile.create({
        data: {
          companyName: data.companyName,
          logo: data.logo,
          user: { connect: { id: userId } },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error creating advertiser profile', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find advertiser profile by ID
   */
  async findProfileById(id: string): Promise<AdvertiserProfile | null> {
    try {
      return await prisma.advertiserProfile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          campaigns: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding advertiser by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find advertiser profile by user ID
   */
  async findProfileByUserId(userId: string): Promise<AdvertiserProfile | null> {
    try {
      return await prisma.advertiserProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          campaigns: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding advertiser by user ID', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update advertiser profile
   */
  async updateProfile(
    id: string,
    data: {
      companyName?: string;
      logo?: string;
    }
  ): Promise<AdvertiserProfile> {
    try {
      return await prisma.advertiserProfile.update({
        where: { id },
        data,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating advertiser profile', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete advertiser profile
   */
  async deleteProfile(id: string): Promise<AdvertiserProfile> {
    try {
      return await prisma.advertiserProfile.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting advertiser profile', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get all advertisers (admin)
   */
  async getAllProfiles(
    page = 1,
    limit = 20
  ): Promise<{ advertisers: AdvertiserProfile[]; total: number }> {
    const skip = (page - 1) * limit;

    try {
      const [advertisers, total] = await Promise.all([
        prisma.advertiserProfile.findMany({
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
            _count: {
              select: { campaigns: true },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.advertiserProfile.count(),
      ]);

      return { advertisers, total };
    } catch (error) {
      logger.error('Error getting all advertisers', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // ==================== CAMPAIGNS ====================

  /**
   * Create a campaign
   */
  async createCampaign(
    advertiserId: string,
    data: {
      name: string;
      format: AdFormat;
      imageUrl: string;
      title: string;
      description?: string;
      ctaText?: string;
      targetUrl?: string;
      targetCities?: any;
      targetCategories?: any;
      targetAgeRange?: any;
      budget: number;
      costModel?: string;
      bidAmount: number;
      startDate: Date;
      endDate: Date;
    }
  ): Promise<AdCampaign> {
    try {
      return await prisma.adCampaign.create({
        data: {
          ...data,
          advertiser: { connect: { id: advertiserId } },
        },
        include: {
          advertiser: {
            select: {
              id: true,
              companyName: true,
              logo: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error creating campaign', {
        advertiserId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find campaign by ID
   */
  async findCampaignById(id: string): Promise<AdCampaign | null> {
    try {
      return await prisma.adCampaign.findUnique({
        where: { id },
        include: {
          advertiser: {
            select: {
              id: true,
              companyName: true,
              logo: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding campaign by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get campaigns by advertiser
   */
  async getCampaignsByAdvertiser(
    advertiserId: string,
    options: {
      status?: CampaignStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ campaigns: AdCampaign[]; total: number }> {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.AdCampaignWhereInput = {
        advertiserId,
        ...(status && { status }),
      };

      const [campaigns, total] = await Promise.all([
        prisma.adCampaign.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.adCampaign.count({ where }),
      ]);

      return { campaigns, total };
    } catch (error) {
      logger.error('Error getting campaigns by advertiser', {
        advertiserId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    id: string,
    data: Prisma.AdCampaignUpdateInput
  ): Promise<AdCampaign> {
    try {
      return await prisma.adCampaign.update({
        where: { id },
        data,
        include: {
          advertiser: {
            select: {
              id: true,
              companyName: true,
              logo: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating campaign', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(
    id: string,
    status: CampaignStatus
  ): Promise<AdCampaign> {
    try {
      return await prisma.adCampaign.update({
        where: { id },
        data: { status },
      });
    } catch (error) {
      logger.error('Error updating campaign status', {
        id,
        status,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string): Promise<AdCampaign> {
    try {
      return await prisma.adCampaign.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting campaign', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get active campaigns for display
   */
  async getActiveCampaigns(options: {
    format?: AdFormat;
    city?: string;
    category?: string;
    limit?: number;
  }): Promise<AdCampaign[]> {
    const { format, limit = 5 } = options;
    const now = new Date();

    try {
      return await prisma.adCampaign.findMany({
        where: {
          status: 'ACTIVE',
          startDate: { lte: now },
          endDate: { gte: now },
          ...(format && { format }),
        },
        include: {
          advertiser: {
            select: {
              companyName: true,
              logo: true,
            },
          },
        },
        take: limit,
        orderBy: [{ bidAmount: 'desc' }, { impressions: 'asc' }],
      });
    } catch (error) {
      logger.error('Error getting active campaigns', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get pending approval campaigns (admin)
   */
  async getPendingCampaigns(
    page = 1,
    limit = 20
  ): Promise<{ campaigns: AdCampaign[]; total: number }> {
    const skip = (page - 1) * limit;

    try {
      const [campaigns, total] = await Promise.all([
        prisma.adCampaign.findMany({
          where: { status: 'PENDING_APPROVAL' },
          include: {
            advertiser: {
              select: {
                id: true,
                companyName: true,
                logo: true,
                user: {
                  select: {
                    email: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'asc' },
        }),
        prisma.adCampaign.count({ where: { status: 'PENDING_APPROVAL' } }),
      ]);

      return { campaigns, total };
    } catch (error) {
      logger.error('Error getting pending campaigns', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Increment campaign impressions
   */
  async incrementImpressions(id: string): Promise<AdCampaign> {
    try {
      return await prisma.adCampaign.update({
        where: { id },
        data: {
          impressions: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error('Error incrementing impressions', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Increment campaign clicks
   */
  async incrementClicks(id: string): Promise<AdCampaign> {
    try {
      return await prisma.adCampaign.update({
        where: { id },
        data: {
          clicks: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error('Error incrementing clicks', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Increment campaign conversions
   */
  async incrementConversions(id: string): Promise<AdCampaign> {
    try {
      return await prisma.adCampaign.update({
        where: { id },
        data: {
          conversions: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error('Error incrementing conversions', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update campaign spent amount
   */
  async updateSpentAmount(id: string, amount: number): Promise<AdCampaign> {
    try {
      return await prisma.adCampaign.update({
        where: { id },
        data: {
          spent: { increment: amount },
        },
      });
    } catch (error) {
      logger.error('Error updating spent amount', {
        id,
        amount,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get campaigns that have exhausted budget
   */
  async getExhaustedBudgetCampaigns(): Promise<AdCampaign[]> {
    try {
      return await prisma.$queryRaw<AdCampaign[]>`
        SELECT * FROM "ad_campaigns"
        WHERE status = 'ACTIVE'
          AND spent >= budget
      `;
    } catch (error) {
      logger.error('Error getting exhausted budget campaigns', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get campaigns that have ended
   */
  async getEndedCampaigns(): Promise<AdCampaign[]> {
    const now = new Date();

    try {
      return await prisma.adCampaign.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { lt: now },
        },
      });
    } catch (error) {
      logger.error('Error getting ended campaigns', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get campaign statistics summary
   */
  async getCampaignStats(id: string): Promise<{
    impressions: number;
    clicks: number;
    conversions: number;
    spent: number;
    ctr: number;
    conversionRate: number;
    cpc: number;
    cpm: number;
  }> {
    try {
      const campaign = await prisma.adCampaign.findUnique({
        where: { id },
        select: {
          impressions: true,
          clicks: true,
          conversions: true,
          spent: true,
        },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const { impressions, clicks, conversions, spent } = campaign;

      return {
        impressions,
        clicks,
        conversions,
        spent,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        cpc: clicks > 0 ? spent / clicks : 0,
        cpm: impressions > 0 ? (spent / impressions) * 1000 : 0,
      };
    } catch (error) {
      logger.error('Error getting campaign stats', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get all campaigns (admin) with filters
   */
  async getAllCampaigns(options: {
    status?: CampaignStatus;
    format?: AdFormat;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ campaigns: AdCampaign[]; total: number }> {
    const {
      status,
      format,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = options;
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.AdCampaignWhereInput = {
        ...(status && { status }),
        ...(format && { format }),
        ...(startDate && { startDate: { gte: startDate } }),
        ...(endDate && { endDate: { lte: endDate } }),
      };

      const [campaigns, total] = await Promise.all([
        prisma.adCampaign.findMany({
          where,
          include: {
            advertiser: {
              select: {
                id: true,
                companyName: true,
                logo: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.adCampaign.count({ where }),
      ]);

      return { campaigns, total };
    } catch (error) {
      logger.error('Error getting all campaigns', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new AdvertiserRepository();
