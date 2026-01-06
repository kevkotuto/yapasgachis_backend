import { AssociationProfile, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Association Repository
 * Data access layer for association profiles
 */
export class AssociationRepository {
  /**
   * Create a new association profile
   */
  async create(
    userId: string,
    data: {
      name: string;
      description: string;
      logo?: string;
      registrationNumber: string;
      legalDocuments?: any;
      address: string;
      latitude: number;
      longitude: number;
      serviceArea: any;
      acceptedFoodTypes: any;
      collectionSchedule: any;
      collectionPoints?: any;
      mobileMoney?: string;
      bankAccount?: any;
    }
  ): Promise<AssociationProfile> {
    try {
      return await prisma.associationProfile.create({
        data: {
          ...data,
          user: { connect: { id: userId } },
        },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error creating association profile', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find association profile by ID
   */
  async findById(id: string): Promise<AssociationProfile | null> {
    try {
      return await prisma.associationProfile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              firstName: true,
              lastName: true,
              city: true,
              commune: true,
            },
          },
          donations: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          reports: {
            take: 5,
            orderBy: { publishedAt: 'desc' },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding association by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find association profile by user ID
   */
  async findByUserId(userId: string): Promise<AssociationProfile | null> {
    try {
      return await prisma.associationProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              firstName: true,
              lastName: true,
              city: true,
              commune: true,
            },
          },
          donations: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          reports: {
            take: 5,
            orderBy: { publishedAt: 'desc' },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding association by user ID', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update association profile
   */
  async update(
    id: string,
    data: Prisma.AssociationProfileUpdateInput
  ): Promise<AssociationProfile> {
    try {
      return await prisma.associationProfile.update({
        where: { id },
        data,
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating association profile', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete association profile
   */
  async delete(id: string): Promise<AssociationProfile> {
    try {
      return await prisma.associationProfile.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting association profile', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Search associations with filters
   */
  async search(params: {
    search?: string;
    verified?: boolean;
    acceptedFoodType?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }): Promise<{ associations: AssociationProfile[]; total: number }> {
    const {
      search,
      verified,
      latitude,
      longitude,
      radius = 20,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    try {
      const where: Prisma.AssociationProfileWhereInput = {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(verified !== undefined && { verified }),
      };

      let associations: AssociationProfile[];
      let total: number;

      if (latitude && longitude) {
        const allAssociations = await prisma.associationProfile.findMany({
          where: {
            ...where,
            latitude: { not: null },
            longitude: { not: null },
          },
          include: {
            user: {
              select: {
                id: true,
                phoneNumber: true,
                email: true,
                firstName: true,
                lastName: true,
                city: true,
                commune: true,
              },
            },
          },
        });

        const associationsWithDistance = allAssociations
          .map((association) => {
            const distance = this.calculateDistance(
              latitude,
              longitude,
              association.latitude,
              association.longitude
            );
            return { ...association, distance };
          })
          .filter((association) => association.distance <= radius)
          .sort((a, b) => a.distance - b.distance);

        total = associationsWithDistance.length;
        associations = associationsWithDistance.slice(skip, skip + limit);
      } else {
        [associations, total] = await Promise.all([
          prisma.associationProfile.findMany({
            where,
            include: {
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  city: true,
                  commune: true,
                },
              },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
          }),
          prisma.associationProfile.count({ where }),
        ]);
      }

      return { associations, total };
    } catch (error) {
      logger.error('Error searching associations', {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get all verified associations
   */
  async findAllVerified(): Promise<AssociationProfile[]> {
    try {
      return await prisma.associationProfile.findMany({
        where: { verified: true },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      logger.error('Error finding all verified associations', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get associations pending verification
   */
  async findPendingVerification(): Promise<AssociationProfile[]> {
    try {
      return await prisma.associationProfile.findMany({
        where: { verified: false },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      logger.error('Error finding pending associations', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Verify an association
   */
  async verify(id: string): Promise<AssociationProfile> {
    try {
      return await prisma.associationProfile.update({
        where: { id },
        data: { verified: true },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error verifying association', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update association statistics
   */
  async updateStats(
    id: string,
    donationsReceived: number,
    valueReceived: number
  ): Promise<AssociationProfile> {
    try {
      return await prisma.associationProfile.update({
        where: { id },
        data: {
          totalDonationsReceived: { increment: donationsReceived },
          totalValueReceived: { increment: valueReceived },
        },
      });
    } catch (error) {
      logger.error('Error updating association stats', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Create an association report
   */
  async createReport(
    associationId: string,
    data: {
      title: string;
      description: string;
      images?: any;
      donationsUsed?: any;
      beneficiaries?: number;
      impactMetrics?: any;
    }
  ) {
    try {
      return await prisma.associationReport.create({
        data: {
          ...data,
          association: { connect: { id: associationId } },
        },
      });
    } catch (error) {
      logger.error('Error creating association report', {
        associationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get reports for an association
   */
  async getReports(associationId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    try {
      const [reports, total] = await Promise.all([
        prisma.associationReport.findMany({
          where: { associationId },
          skip,
          take: limit,
          orderBy: { publishedAt: 'desc' },
        }),
        prisma.associationReport.count({ where: { associationId } }),
      ]);

      return { reports, total };
    } catch (error) {
      logger.error('Error getting association reports', {
        associationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export default new AssociationRepository();
