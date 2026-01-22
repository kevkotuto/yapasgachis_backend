import { TeamMember, Prisma } from '@prisma/client';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';

export class TeamMemberRepository {
  async create(data: any): Promise<TeamMember> {
    try {
      return await prisma.teamMember.create({ data });
    } catch (error) {
      logger.error('Error creating team member', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async findById(id: string): Promise<TeamMember | null> {
    try {
      return await prisma.teamMember.findUnique({
        where: { id },
        include: {
          supplier: { select: { id: true, businessName: true } },
          store: { select: { id: true, name: true } },
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
  ): Promise<{ members: TeamMember[]; total: number }> {
    const { page = 1, limit = 20, role, isActive, storeId } = filters || {};
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.TeamMemberWhereInput = {
        supplierId,
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(storeId && { storeId }),
      };

      const [members, total] = await Promise.all([
        prisma.teamMember.findMany({
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
        prisma.teamMember.count({ where }),
      ]);

      return { members, total };
    } catch (error) {
      logger.error('Error finding team members', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async update(id: string, data: any): Promise<TeamMember> {
    try {
      return await prisma.teamMember.update({ where: { id }, data });
    } catch (error) {
      logger.error('Error updating team member', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async delete(id: string): Promise<TeamMember> {
    try {
      return await prisma.teamMember.delete({ where: { id } });
    } catch (error) {
      logger.error('Error deleting team member', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async getStats(supplierId: string) {
    try {
      const [total, active, pending, byRole] = await Promise.all([
        prisma.teamMember.count({ where: { supplierId } }),
        prisma.teamMember.count({ where: { supplierId, isActive: true } }),
        prisma.teamMember.count({
          where: { supplierId, invitationStatus: 'PENDING' },
        }),
        prisma.teamMember.groupBy({
          by: ['role'],
          where: { supplierId },
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
