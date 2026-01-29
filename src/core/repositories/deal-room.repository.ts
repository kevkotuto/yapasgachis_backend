import { DealRoom, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Deal Room Repository
 * Data access layer for deal rooms (hotel rooms, etc.)
 */
export class DealRoomRepository {
  /**
   * Create a new room for a deal
   */
  async create(data: Prisma.DealRoomCreateInput): Promise<DealRoom> {
    try {
      return await prisma.dealRoom.create({
        data,
      });
    } catch (error) {
      logger.error('Error creating deal room', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Find room by ID
   */
  async findById(id: string): Promise<DealRoom | null> {
    try {
      return await prisma.dealRoom.findUnique({
        where: { id },
        include: {
          deal: {
            select: {
              id: true,
              title: true,
              supplierId: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding deal room by ID', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get all rooms for a deal
   */
  async findByDealId(dealId: string): Promise<DealRoom[]> {
    try {
      return await prisma.dealRoom.findMany({
        where: { dealId },
        orderBy: { price: 'asc' },
      });
    } catch (error) {
      logger.error('Error finding rooms by deal ID', {
        dealId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get available rooms for a deal
   */
  async findAvailableByDealId(dealId: string): Promise<DealRoom[]> {
    try {
      return await prisma.dealRoom.findMany({
        where: {
          dealId,
          isAvailable: true,
        },
        orderBy: { price: 'asc' },
      });
    } catch (error) {
      logger.error('Error finding available rooms by deal ID', {
        dealId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update room
   */
  async update(
    id: string,
    data: Prisma.DealRoomUpdateInput
  ): Promise<DealRoom> {
    try {
      return await prisma.dealRoom.update({
        where: { id },
        data,
      });
    } catch (error) {
      logger.error('Error updating deal room', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete room
   */
  async delete(id: string): Promise<void> {
    try {
      await prisma.dealRoom.delete({
        where: { id },
      });
      logger.info('Deal room deleted', { id });
    } catch (error) {
      logger.error('Error deleting deal room', {
        id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Check if room exists and belongs to deal
   */
  async existsInDeal(id: string, dealId: string): Promise<boolean> {
    try {
      const room = await prisma.dealRoom.findFirst({
        where: {
          id,
          dealId,
        },
      });
      return room !== null;
    } catch (error) {
      logger.error('Error checking if room exists in deal', {
        id,
        dealId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Count rooms for a deal
   */
  async countByDealId(dealId: string): Promise<number> {
    try {
      return await prisma.dealRoom.count({
        where: { dealId },
      });
    } catch (error) {
      logger.error('Error counting rooms by deal ID', {
        dealId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
