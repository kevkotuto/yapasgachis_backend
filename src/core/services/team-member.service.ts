import teamMemberRepository from '@/core/repositories/team-member.repository';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/utils/helpers';
import crypto from 'crypto';

export class TeamMemberService {
  async inviteTeamMember(supplierId: string, data: any) {
    // Verify store belongs to supplier if provided
    if (data.storeId) {
      const store = await prisma.supplierStore.findUnique({
        where: { id: data.storeId },
        select: { supplierId: true },
      });

      if (!store || store.store.supplierId !== supplierId) {
        throw new AppError(403, 'Magasin invalide');
      }
    }

    // Generate invitation token
    const inviteToken = crypto.randomBytes(32).toString('hex');

    const member = await teamMemberRepository.create({
      supplierId,
      storeId: data.storeId,
      email: data.email,
      phoneNumber: data.phoneNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      permissions: data.permissions || [],
      inviteToken,
      inviteStatus: 'PENDING',
      isActive: true,
    });

    // TODO: Send invitation email/SMS

    logger.info('Team member invited', { supplierId, memberId: member.id });
    return member;
  }

  async getTeamMember(id: string) {
    const member = await teamMemberRepository.findById(id);
    if (!member) throw new AppError(404, 'Membre non trouvé');
    return member;
  }

  async getTeamMembers(supplierId: string, filters: any) {
    const result = await teamMemberRepository.findBySupplier(
      supplierId,
      filters
    );
    return {
      ...result,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        totalPages: Math.ceil(result.total / (filters.limit || 20)),
      },
    };
  }

  async updateTeamMember(supplierId: string, memberId: string, data: any) {
    const member = await teamMemberRepository.findById(memberId);
    if (!member) throw new AppError(404, 'Membre non trouvé');
    if (member.store.supplierId !== supplierId)
      throw new AppError(403, 'Non autorisé');

    const updated = await teamMemberRepository.update(memberId, data);
    logger.info('Team member updated', { supplierId, memberId });
    return updated;
  }

  async deleteTeamMember(supplierId: string, memberId: string) {
    const member = await teamMemberRepository.findById(memberId);
    if (!member) throw new AppError(404, 'Membre non trouvé');
    if (member.store.supplierId !== supplierId)
      throw new AppError(403, 'Non autorisé');

    await teamMemberRepository.delete(memberId);
    logger.info('Team member deleted', { supplierId, memberId });
    return { success: true };
  }

  async acceptInvitation(token: string, userId: string) {
    const member = await prisma.storeStaff.findFirst({
      where: { inviteToken: token },
    });

    if (!member) throw new AppError(404, 'Invitation invalide');
    if (member.inviteStatus !== 'PENDING') {
      throw new AppError(400, 'Invitation déjà traitée');
    }

    const updated = await teamMemberRepository.update(member.id, {
      userId,
      inviteStatus: 'ACCEPTED',
      acceptedAt: new Date(),
    });

    logger.info('Invitation accepted', { memberId: member.id, userId });
    return updated;
  }

  async getTeamStats(supplierId: string) {
    return await teamMemberRepository.getStats(supplierId);
  }
}

export default new TeamMemberService();
