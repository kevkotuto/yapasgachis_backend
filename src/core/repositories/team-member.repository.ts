import { StoreStaff, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Team Member Repository
 * Uses StoreStaff model for store team management
 */
export class TeamMemberRepository {
  async create(data: any): Promise<StoreStaff> {
    try {
      return await prisma.storeStaff.create({ data });
    } catch (error) {
      logger.error('Error creating team member', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async findById(id: string): Promise<StoreStaff | null> {
    try {
      return await prisma.storeStaff.findUnique({
        where: { id },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              supplierId: true,
              supplier: { select: { id: true, businessName: true } },
            },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding team member', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async findBySupplier(
    supplierId: string,
    filters?: any
  ): Promise<{ members: StoreStaff[]; total: number }> {
    const { page = 1, limit = 20, role, isActive, storeId } = filters || {};
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.StoreStaffWhereInput = {
        store: { supplierId }, // Filter by supplier through store relation
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(storeId && { storeId }),
      };

      const [members, total] = await Promise.all([
        prisma.storeStaff.findMany({
          where,
          include: {
            store: { select: { id: true, name: true } },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.storeStaff.count({ where }),
      ]);

      return { members, total };
    } catch (error) {
      logger.error('Error finding team members', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async update(id: string, data: any): Promise<StoreStaff> {
    try {
      return await prisma.storeStaff.update({ where: { id }, data });
    } catch (error) {
      logger.error('Error updating team member', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async delete(id: string): Promise<StoreStaff> {
    try {
      return await prisma.storeStaff.delete({ where: { id } });
    } catch (error) {
      logger.error('Error deleting team member', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async getStats(supplierId: string) {
    try {
      const where = { store: { supplierId } };

      const [total, active, pending, byRole] = await Promise.all([
        prisma.storeStaff.count({ where }),
        prisma.storeStaff.count({ where: { ...where, isActive: true } }),
        prisma.storeStaff.count({
          where: { ...where, inviteStatus: 'PENDING' },
        }),
        prisma.storeStaff.groupBy({
          by: ['role'],
          where,
          _count: { role: true },
        }),
      ]);

      const membersByRole = byRole.reduce((acc, curr) => {
        acc[curr.role] = curr._count.role;
        return acc;
      }, {} as any);

      return {
        totalMembers: total,
        activeMembers: active,
        pendingInvitations: pending,
        membersByRole,
      };
    } catch (error) {
      logger.error('Error getting team stats', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new TeamMemberRepository();
