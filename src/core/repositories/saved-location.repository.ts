import { SavedLocation, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * SavedLocation Repository
 * Data access layer for saved locations
 */
export class SavedLocationRepository {
  /**
   * Create new saved location
   */
  async create(data: Prisma.SavedLocationCreateInput): Promise<SavedLocation> {
    return prisma.savedLocation.create({
      data,
    });
  }

  /**
   * Find saved location by ID
   */
  async findById(id: string): Promise<SavedLocation | null> {
    return prisma.savedLocation.findUnique({
      where: { id },
    });
  }

  /**
   * Find all saved locations for a user
   */
  async findByUserId(userId: string): Promise<SavedLocation[]> {
    return prisma.savedLocation.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Find default location for a user
   */
  async findDefaultByUserId(userId: string): Promise<SavedLocation | null> {
    return prisma.savedLocation.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });
  }

  /**
   * Update saved location
   */
  async update(
    id: string,
    data: Prisma.SavedLocationUpdateInput
  ): Promise<SavedLocation> {
    return prisma.savedLocation.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete saved location
   */
  async delete(id: string): Promise<SavedLocation> {
    return prisma.savedLocation.delete({
      where: { id },
    });
  }

  /**
   * Set a location as default and unset others for the user
   * Uses transaction to ensure atomicity
   */
  async setAsDefault(id: string, userId: string): Promise<SavedLocation> {
    return prisma.$transaction(async (tx) => {
      // First, unset all default locations for this user
      await tx.savedLocation.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });

      // Then set the specified location as default
      const updatedLocation = await tx.savedLocation.update({
        where: { id },
        data: {
          isDefault: true,
        },
      });

      return updatedLocation;
    });
  }

  /**
   * Count saved locations for a user
   */
  async countByUserId(userId: string): Promise<number> {
    return prisma.savedLocation.count({
      where: { userId },
    });
  }

  /**
   * Check if location exists and belongs to user
   */
  async existsByIdAndUserId(id: string, userId: string): Promise<boolean> {
    const count = await prisma.savedLocation.count({
      where: {
        id,
        userId,
      },
    });
    return count > 0;
  }

  /**
   * Find saved location by ID and userId (ownership check)
   */
  async findByIdAndUserId(
    id: string,
    userId: string
  ): Promise<SavedLocation | null> {
    return prisma.savedLocation.findFirst({
      where: {
        id,
        userId,
      },
    });
  }
}

export default new SavedLocationRepository();
