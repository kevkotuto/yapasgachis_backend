import { Donation, DonationType, DonationStatus, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Donation Repository
 * Data access layer for donations (food and financial)
 */
export class DonationRepository {
  /**
   * Create a new donation
   */
  async create(data: {
    donorId: string;
    associationId: string;
    type: DonationType;
    productId?: string;
    quantity?: number;
    unit?: string;
    amount?: number;
    currency?: string;
    paymentReference?: string;
    pickupScheduled?: Date;
  }): Promise<Donation> {
    try {
      return await prisma.donation.create({
        data: {
          donor: { connect: { id: data.donorId } },
          association: { connect: { id: data.associationId } },
          type: data.type,
          ...(data.productId && {
            product: { connect: { id: data.productId } },
          }),
          quantity: data.quantity,
          unit: data.unit,
          amount: data.amount,
          currency: data.currency || 'XOF',
          paymentReference: data.paymentReference,
          pickupScheduled: data.pickupScheduled,
        },
        include: {
          donor: {
            select: {
              id: true,
              phoneNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          association: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              category: true,
              images: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error creating donation', {
        data,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find donation by ID
   */
  async findById(id: string): Promise<Donation | null> {
    try {
      return await prisma.donation.findUnique({
        where: { id },
        include: {
          donor: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          association: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              category: true,
              images: true,
              supplier: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding donation by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update donation
   */
  async update(
    id: string,
    data: Prisma.DonationUpdateInput
  ): Promise<Donation> {
    try {
      return await prisma.donation.update({
        where: { id },
        data,
        include: {
          donor: {
            select: {
              id: true,
              phoneNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          association: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          product: true,
        },
      });
    } catch (error) {
      logger.error('Error updating donation', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update donation status
   */
  async updateStatus(id: string, status: DonationStatus): Promise<Donation> {
    try {
      const updateData: Prisma.DonationUpdateInput = { status };

      if (status === DonationStatus.COLLECTED) {
        updateData.pickupCompleted = new Date();
      }

      return await prisma.donation.update({
        where: { id },
        data: updateData,
        include: {
          donor: {
            select: {
              id: true,
              phoneNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          association: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error updating donation status', {
        id,
        status,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete donation
   */
  async delete(id: string): Promise<Donation> {
    try {
      return await prisma.donation.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting donation', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get donations by donor
   */
  async findByDonor(
    donorId: string,
    params: {
      type?: DonationType;
      status?: DonationStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ donations: Donation[]; total: number }> {
    const { type, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.DonationWhereInput = {
        donorId,
        ...(type && { type }),
        ...(status && { status }),
      };

      const [donations, total] = await Promise.all([
        prisma.donation.findMany({
          where,
          include: {
            association: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
            product: {
              select: {
                id: true,
                title: true,
                images: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.donation.count({ where }),
      ]);

      return { donations, total };
    } catch (error) {
      logger.error('Error finding donations by donor', {
        donorId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get donations by association
   */
  async findByAssociation(
    associationId: string,
    params: {
      type?: DonationType;
      status?: DonationStatus;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ donations: Donation[]; total: number }> {
    const { type, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.DonationWhereInput = {
        associationId,
        ...(type && { type }),
        ...(status && { status }),
      };

      const [donations, total] = await Promise.all([
        prisma.donation.findMany({
          where,
          include: {
            donor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            product: {
              select: {
                id: true,
                title: true,
                images: true,
                supplier: {
                  select: {
                    id: true,
                    businessName: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.donation.count({ where }),
      ]);

      return { donations, total };
    } catch (error) {
      logger.error('Error finding donations by association', {
        associationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get pending food donations ready for pickup
   */
  async findPendingPickups(associationId: string): Promise<Donation[]> {
    try {
      return await prisma.donation.findMany({
        where: {
          associationId,
          type: DonationType.FOOD,
          status: { in: [DonationStatus.PENDING, DonationStatus.SCHEDULED] },
        },
        include: {
          donor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              images: true,
              expiryDate: true,
              supplier: {
                select: {
                  id: true,
                  businessName: true,
                  address: true,
                  latitude: true,
                  longitude: true,
                },
              },
            },
          },
        },
        orderBy: { pickupScheduled: 'asc' },
      });
    } catch (error) {
      logger.error('Error finding pending pickups', {
        associationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get donation statistics for a donor
   */
  async getDonorStats(donorId: string): Promise<{
    totalDonations: number;
    foodDonations: number;
    financialDonations: number;
    totalAmountDonated: number;
    totalQuantityDonated: number;
  }> {
    try {
      const donations = await prisma.donation.findMany({
        where: {
          donorId,
          status: {
            in: [DonationStatus.COMPLETED, DonationStatus.DISTRIBUTED],
          },
        },
        select: {
          type: true,
          amount: true,
          quantity: true,
        },
      });

      const stats = donations.reduce(
        (acc, donation) => {
          acc.totalDonations++;
          if (donation.type === DonationType.FOOD) {
            acc.foodDonations++;
            acc.totalQuantityDonated += donation.quantity || 0;
          } else {
            acc.financialDonations++;
            acc.totalAmountDonated += donation.amount || 0;
          }
          return acc;
        },
        {
          totalDonations: 0,
          foodDonations: 0,
          financialDonations: 0,
          totalAmountDonated: 0,
          totalQuantityDonated: 0,
        }
      );

      return stats;
    } catch (error) {
      logger.error('Error getting donor stats', {
        donorId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get donation statistics for an association
   */
  async getAssociationStats(associationId: string): Promise<{
    totalDonationsReceived: number;
    foodDonationsReceived: number;
    financialDonationsReceived: number;
    totalAmountReceived: number;
    totalQuantityReceived: number;
    pendingDonations: number;
  }> {
    try {
      const [completedDonations, pendingCount] = await Promise.all([
        prisma.donation.findMany({
          where: {
            associationId,
            status: {
              in: [DonationStatus.COMPLETED, DonationStatus.DISTRIBUTED],
            },
          },
          select: {
            type: true,
            amount: true,
            quantity: true,
          },
        }),
        prisma.donation.count({
          where: {
            associationId,
            status: { in: [DonationStatus.PENDING, DonationStatus.SCHEDULED] },
          },
        }),
      ]);

      const stats = completedDonations.reduce(
        (acc, donation) => {
          acc.totalDonationsReceived++;
          if (donation.type === DonationType.FOOD) {
            acc.foodDonationsReceived++;
            acc.totalQuantityReceived += donation.quantity || 0;
          } else {
            acc.financialDonationsReceived++;
            acc.totalAmountReceived += donation.amount || 0;
          }
          return acc;
        },
        {
          totalDonationsReceived: 0,
          foodDonationsReceived: 0,
          financialDonationsReceived: 0,
          totalAmountReceived: 0,
          totalQuantityReceived: 0,
          pendingDonations: pendingCount,
        }
      );

      return stats;
    } catch (error) {
      logger.error('Error getting association stats', {
        associationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Generate donation receipt
   */
  async generateReceipt(id: string, receiptUrl: string): Promise<Donation> {
    try {
      return await prisma.donation.update({
        where: { id },
        data: { receiptUrl },
      });
    } catch (error) {
      logger.error('Error generating receipt', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Generate donation certificate
   */
  async generateCertificate(
    id: string,
    certificateUrl: string
  ): Promise<Donation> {
    try {
      return await prisma.donation.update({
        where: { id },
        data: { certificateUrl },
      });
    } catch (error) {
      logger.error('Error generating certificate', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Search all donations with filters
   */
  async search(params: {
    type?: DonationType;
    status?: DonationStatus;
    associationId?: string;
    donorId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ donations: Donation[]; total: number }> {
    const {
      type,
      status,
      associationId,
      donorId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    try {
      const where: Prisma.DonationWhereInput = {
        ...(type && { type }),
        ...(status && { status }),
        ...(associationId && { associationId }),
        ...(donorId && { donorId }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      };

      const [donations, total] = await Promise.all([
        prisma.donation.findMany({
          where,
          include: {
            donor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            association: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
            product: {
              select: {
                id: true,
                title: true,
                images: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.donation.count({ where }),
      ]);

      return { donations, total };
    } catch (error) {
      logger.error('Error searching donations', {
        params,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new DonationRepository();
