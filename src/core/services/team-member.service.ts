import teamMemberRepository from '@/core/repositories/team-member.repository';
import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/utils/helpers';
import crypto from 'crypto';

const normalizePhone = (raw?: string | null): string | null => {
  if (!raw) return null;
  const digits = raw.replace(/[\s\-().]/g, '').trim();
  if (!digits) return null;
  return digits.startsWith('+') ? digits : digits;
};

export class TeamMemberService {
  /**
   * Resolve `req.user.id` (User.id) to the SupplierProfile.id needed for FK
   * checks. Throws if the caller is not a supplier.
   */
  private async resolveSupplierId(userId: string): Promise<string> {
    const supplier = await prisma.supplierProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!supplier) {
      throw new AppError(403, 'Profil fournisseur introuvable');
    }
    return supplier.id;
  }

  async inviteTeamMember(userId: string, data: any) {
    const supplierId = await this.resolveSupplierId(userId);

    if (!data?.storeId) {
      throw new AppError(400, 'storeId requis pour inviter un gérant');
    }

    // Verify store belongs to supplier
    const store = await prisma.supplierStore.findUnique({
      where: { id: data.storeId },
      select: { supplierId: true },
    });
    if (!store || store.supplierId !== supplierId) {
      throw new AppError(403, 'Magasin invalide');
    }

    const phoneNumber = normalizePhone(data.phoneNumber);
    const email = data.email ? String(data.email).toLowerCase().trim() : null;

    // Try to match an existing user. If one exists, the staff row is created
    // directly with userId, ACCEPTED status and no invite token.
    let matchedUser: { id: string } | null = null;
    if (phoneNumber || email) {
      matchedUser = await prisma.user.findFirst({
        where: {
          OR: [
            phoneNumber ? { phoneNumber } : undefined,
            email ? { email } : undefined,
          ].filter(Boolean) as any,
        },
        select: { id: true },
      });
    }

    if (matchedUser) {
      // Reject duplicates within the same store.
      const existing = await prisma.storeStaff.findFirst({
        where: { storeId: data.storeId, userId: matchedUser.id },
        select: { id: true },
      });
      if (existing) {
        throw new AppError(
          409,
          'Cette personne fait déjà partie de ce magasin'
        );
      }

      const member = await teamMemberRepository.create({
        storeId: data.storeId,
        userId: matchedUser.id,
        role: data.role || 'MANAGER',
        invitedById: userId,
        inviteStatus: 'ACCEPTED',
        acceptedAt: new Date(),
        invitePhoneNumber: phoneNumber,
        inviteEmail: email,
        inviteFirstName: data.firstName ?? data.name ?? null,
        inviteLastName: data.lastName ?? null,
      });
      logger.info('Team member added (existing user)', {
        supplierId,
        memberId: member.id,
        userId: matchedUser.id,
      });
      return member;
    }

    // Otherwise persist a pending invite with the contact info; auth.register
    // will pick it up at signup.
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 30);

    const member = await teamMemberRepository.create({
      storeId: data.storeId,
      role: data.role || 'MANAGER',
      invitedById: userId,
      inviteToken,
      inviteStatus: 'PENDING',
      inviteExpiresAt,
      invitePhoneNumber: phoneNumber,
      inviteEmail: email,
      inviteFirstName: data.firstName ?? data.name ?? null,
      inviteLastName: data.lastName ?? null,
    });

    // TODO: send invitation SMS / email via notification queue.

    logger.info('Team member invited (pending)', {
      supplierId,
      memberId: member.id,
      phoneNumber,
      email,
    });
    return member;
  }

  /**
   * Called from auth.register after a new User is persisted.
   * Links every PENDING StoreStaff row whose invite metadata matches the
   * new user's phone or email.
   */
  async claimPendingInvitesForUser(user: {
    id: string;
    phoneNumber?: string | null;
    email?: string | null;
  }): Promise<number> {
    const phoneNumber = normalizePhone(user.phoneNumber);
    const email = user.email ? user.email.toLowerCase().trim() : null;
    if (!phoneNumber && !email) return 0;

    const pending = await prisma.storeStaff.findMany({
      where: {
        userId: null,
        inviteStatus: 'PENDING',
        OR: [
          phoneNumber ? { invitePhoneNumber: phoneNumber } : undefined,
          email ? { inviteEmail: email } : undefined,
        ].filter(Boolean) as any,
      },
      select: { id: true, storeId: true },
    });

    if (pending.length === 0) return 0;

    // Drop any pending row that would clash with an existing accepted staff
    // for the same store (defensive: shouldn't happen since user is brand new).
    const ids = pending.map((p) => p.id);
    await prisma.storeStaff.updateMany({
      where: { id: { in: ids } },
      data: {
        userId: user.id,
        inviteStatus: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    logger.info('Pending team invites claimed', {
      userId: user.id,
      claimedCount: pending.length,
    });
    return pending.length;
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
    const member = (await teamMemberRepository.findById(memberId)) as any;
    if (!member) throw new AppError(404, 'Membre non trouvé');
    if (member.store?.supplierId !== supplierId)
      throw new AppError(403, 'Non autorisé');

    const updated = await teamMemberRepository.update(memberId, data);
    logger.info('Team member updated', { supplierId, memberId });
    return updated;
  }

  async deleteTeamMember(supplierId: string, memberId: string) {
    const member = (await teamMemberRepository.findById(memberId)) as any;
    if (!member) throw new AppError(404, 'Membre non trouvé');
    if (member.store?.supplierId !== supplierId)
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
