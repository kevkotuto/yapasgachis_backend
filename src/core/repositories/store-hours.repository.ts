import { StoreHours, SpecialClosure, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Store Hours Repository
 * Data access layer for store operating hours
 */
export class StoreHoursRepository {
  /**
   * Create store hours
   */
  async create(data: {
    storeId: string;
    hours: any;
    timezone?: string;
    specialNotes?: string;
  }): Promise<StoreHours> {
    try {
      return await prisma.storeHours.create({
        data: {
          storeId: data.storeId,
          hours: data.hours,
          timezone: data.timezone || 'Africa/Abidjan',
          specialNotes: data.specialNotes,
        },
      });
    } catch (error) {
      logger.error('Error creating store hours', {
        data,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find store hours by store ID
   */
  async findByStoreId(storeId: string): Promise<StoreHours | null> {
    try {
      return await prisma.storeHours.findUnique({
        where: { storeId },
      });
    } catch (error) {
      logger.error('Error finding store hours', {
        storeId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update store hours
   */
  async update(
    storeId: string,
    data: {
      hours?: any;
      timezone?: string;
      specialNotes?: string;
    }
  ): Promise<StoreHours> {
    try {
      return await prisma.storeHours.update({
        where: { storeId },
        data,
      });
    } catch (error) {
      logger.error('Error updating store hours', {
        storeId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete store hours
   */
  async delete(storeId: string): Promise<StoreHours> {
    try {
      return await prisma.storeHours.delete({
        where: { storeId },
      });
    } catch (error) {
      logger.error('Error deleting store hours', {
        storeId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Create special closure
   */
  async createSpecialClosure(data: {
    storeId: string;
    date: Date;
    reason: string;
    allDay: boolean;
    from?: string;
    to?: string;
  }): Promise<SpecialClosure> {
    try {
      return await prisma.specialClosure.create({
        data: {
          storeId: data.storeId,
          date: data.date,
          reason: data.reason,
          allDay: data.allDay,
          from: data.from,
          to: data.to,
        },
      });
    } catch (error) {
      logger.error('Error creating special closure', {
        data,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find special closures for a store
   */
  async findSpecialClosures(
    storeId: string,
    fromDate?: Date
  ): Promise<SpecialClosure[]> {
    try {
      const where: Prisma.SpecialClosureWhereInput = {
        storeId,
        ...(fromDate && { date: { gte: fromDate } }),
      };

      return await prisma.specialClosure.findMany({
        where,
        orderBy: { date: 'asc' },
      });
    } catch (error) {
      logger.error('Error finding special closures', {
        storeId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find special closure by ID
   */
  async findSpecialClosureById(id: string): Promise<SpecialClosure | null> {
    try {
      return await prisma.specialClosure.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding special closure by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete special closure
   */
  async deleteSpecialClosure(id: string): Promise<SpecialClosure> {
    try {
      return await prisma.specialClosure.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting special closure', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Check if store has special closure on a date
   */
  async hasSpecialClosure(storeId: string, date: Date): Promise<boolean> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const count = await prisma.specialClosure.count({
        where: {
          storeId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      return count > 0;
    } catch (error) {
      logger.error('Error checking special closure', {
        storeId,
        date,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new StoreHoursRepository();
