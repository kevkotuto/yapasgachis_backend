import {
  StoreStaff,
  StoreStaffRole,
  StoreStaffInviteStatus,
  User,
} from '@prisma/client';
import crypto from 'crypto';

import { prisma } from '@/infrastructure/database/prisma';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * Store Staff Service
 * Gère le personnel des magasins (employés, gérants, etc.)
 */

// Permissions par défaut selon le rôle
const DEFAULT_PERMISSIONS: Record<
  StoreStaffRole,
  {
    canManageProducts: boolean;
    canManageOrders: boolean;
    canViewStats: boolean;
    canManageStaff: boolean;
    canManageDeals: boolean;
    canManageSettings: boolean;
  }
> = {
  OWNER: {
    canManageProducts: true,
    canManageOrders: true,
    canViewStats: true,
    canManageStaff: true,
    canManageDeals: true,
    canManageSettings: true,
  },
  MANAGER: {
    canManageProducts: true,
    canManageOrders: true,
    canViewStats: true,
    canManageStaff: false,
    canManageDeals: true,
    canManageSettings: false,
  },
  CASHIER: {
    canManageProducts: false,
    canManageOrders: true,
    canViewStats: false,
    canManageStaff: false,
    canManageDeals: false,
    canManageSettings: false,
  },
  STOCK_CLERK: {
    canManageProducts: true,
    canManageOrders: false,
    canViewStats: false,
    canManageStaff: false,
    canManageDeals: false,
    canManageSettings: false,
  },
};

export interface InviteStaffDto {
  storeId: string;
  email?: string;
  phoneNumber?: string;
  role: StoreStaffRole;
  customPermissions?: {
    canManageProducts?: boolean;
    canManageOrders?: boolean;
    canViewStats?: boolean;
    canManageStaff?: boolean;
    canManageDeals?: boolean;
    canManageSettings?: boolean;
  };
  notes?: string;
}

export interface UpdateStaffDto {
  role?: StoreStaffRole;
  isActive?: boolean;
  canManageProducts?: boolean;
  canManageOrders?: boolean;
  canViewStats?: boolean;
  canManageStaff?: boolean;
  canManageDeals?: boolean;
  canManageSettings?: boolean;
  notes?: string;
}

export interface StaffWithUser extends StoreStaff {
  user: Pick<
    User,
    'id' | 'firstName' | 'lastName' | 'email' | 'phoneNumber' | 'avatar'
  >;
}

export class StoreStaffService {
  private static instance: StoreStaffService;

  private constructor() {}

  static getInstance(): StoreStaffService {
    if (!StoreStaffService.instance) {
      StoreStaffService.instance = new StoreStaffService();
    }
    return StoreStaffService.instance;
  }

  /**
   * Vérifier si un utilisateur est le propriétaire du supplier qui possède le store
   */
  async isStoreOwner(userId: string, storeId: string): Promise<boolean> {
    const store = await prisma.supplierStore.findUnique({
      where: { id: storeId },
      include: {
        supplier: {
          select: { userId: true },
        },
      },
    });

    return store?.supplier.userId === userId;
  }

  /**
   * Vérifier si un utilisateur a une permission spécifique sur un magasin
   */
  async hasPermission(
    userId: string,
    storeId: string,
    permission: keyof typeof DEFAULT_PERMISSIONS.OWNER
  ): Promise<boolean> {
    // D'abord, vérifier si c'est le propriétaire du supplier
    const isOwner = await this.isStoreOwner(userId, storeId);
    if (isOwner) return true;

    // Sinon, vérifier les permissions du staff
    const staff = await prisma.storeStaff.findUnique({
      where: {
        storeId_userId: { storeId, userId },
      },
    });

    if (!staff || !staff.isActive || staff.inviteStatus !== 'ACCEPTED') {
      return false;
    }

    return staff[permission];
  }

  /**
   * Récupérer le rôle et permissions d'un utilisateur sur un magasin
   */
  async getStaffRole(
    userId: string,
    storeId: string
  ): Promise<{
    role: StoreStaffRole;
    permissions: typeof DEFAULT_PERMISSIONS.OWNER;
  } | null> {
    // Vérifier si propriétaire
    const isOwner = await this.isStoreOwner(userId, storeId);
    if (isOwner) {
      return {
        role: 'OWNER' as StoreStaffRole,
        permissions: DEFAULT_PERMISSIONS.OWNER,
      };
    }

    // Sinon, récupérer le staff
    const staff = await prisma.storeStaff.findUnique({
      where: {
        storeId_userId: { storeId, userId },
      },
    });

    if (!staff || !staff.isActive || staff.inviteStatus !== 'ACCEPTED') {
      return null;
    }

    return {
      role: staff.role,
      permissions: {
        canManageProducts: staff.canManageProducts,
        canManageOrders: staff.canManageOrders,
        canViewStats: staff.canViewStats,
        canManageStaff: staff.canManageStaff,
        canManageDeals: staff.canManageDeals,
        canManageSettings: staff.canManageSettings,
      },
    };
  }

  /**
   * Inviter un utilisateur à rejoindre le staff d'un magasin
   */
  async inviteStaff(
    inviterId: string,
    data: InviteStaffDto
  ): Promise<StoreStaff> {
    const { storeId, email, phoneNumber, role, customPermissions, notes } =
      data;

    // Vérifier que l'inviteur a le droit d'inviter
    const canInvite = await this.hasPermission(
      inviterId,
      storeId,
      'canManageStaff'
    );
    if (!canInvite) {
      throw new AppError(
        403,
        "Vous n'avez pas le droit d'inviter du personnel",
        'FORBIDDEN'
      );
    }

    // Trouver l'utilisateur à inviter
    if (!email && !phoneNumber) {
      throw new AppError(
        400,
        'Email ou numéro de téléphone requis',
        'MISSING_CONTACT'
      );
    }

    const userToInvite = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phoneNumber ? [{ phoneNumber }] : []),
        ],
      },
    });

    if (!userToInvite) {
      throw new AppError(
        404,
        "Utilisateur non trouvé. L'utilisateur doit d'abord créer un compte.",
        'USER_NOT_FOUND'
      );
    }

    // Vérifier si déjà membre
    const existingStaff = await prisma.storeStaff.findUnique({
      where: {
        storeId_userId: { storeId, userId: userToInvite.id },
      },
    });

    if (existingStaff) {
      if (existingStaff.inviteStatus === 'ACCEPTED') {
        throw new AppError(
          400,
          'Cet utilisateur est déjà membre du personnel',
          'ALREADY_STAFF'
        );
      }
      if (existingStaff.inviteStatus === 'PENDING') {
        throw new AppError(
          400,
          'Une invitation est déjà en attente',
          'INVITE_PENDING'
        );
      }
    }

    // Vérifier si c'est le propriétaire (ne peut pas s'ajouter lui-même)
    const isOwner = await this.isStoreOwner(userToInvite.id, storeId);
    if (isOwner) {
      throw new AppError(
        400,
        'Le propriétaire ne peut pas être ajouté comme staff',
        'OWNER_CANNOT_BE_STAFF'
      );
    }

    // Générer un token d'invitation
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    // Déterminer les permissions
    const permissions = {
      ...DEFAULT_PERMISSIONS[role],
      ...customPermissions,
    };

    // Créer ou mettre à jour l'invitation
    const staff = await prisma.storeStaff.upsert({
      where: {
        storeId_userId: { storeId, userId: userToInvite.id },
      },
      create: {
        storeId,
        userId: userToInvite.id,
        role,
        invitedById: inviterId,
        inviteToken,
        inviteExpiresAt,
        inviteStatus: 'PENDING',
        notes,
        ...permissions,
      },
      update: {
        role,
        invitedById: inviterId,
        inviteToken,
        inviteExpiresAt,
        inviteStatus: 'PENDING',
        invitedAt: new Date(),
        notes,
        ...permissions,
      },
    });

    logger.info('Staff invitation sent', {
      storeId,
      inviterId,
      invitedUserId: userToInvite.id,
      role,
    });

    // TODO: Envoyer une notification à l'utilisateur invité

    return staff;
  }

  /**
   * Accepter une invitation
   */
  async acceptInvitation(
    userId: string,
    inviteToken: string
  ): Promise<StoreStaff> {
    const staff = await prisma.storeStaff.findUnique({
      where: { inviteToken },
    });

    if (!staff) {
      throw new AppError(404, 'Invitation non trouvée', 'INVITE_NOT_FOUND');
    }

    if (staff.userId !== userId) {
      throw new AppError(
        403,
        'Cette invitation ne vous est pas destinée',
        'FORBIDDEN'
      );
    }

    if (staff.inviteStatus !== 'PENDING') {
      throw new AppError(
        400,
        'Cette invitation a déjà été traitée',
        'INVITE_ALREADY_PROCESSED'
      );
    }

    if (staff.inviteExpiresAt && staff.inviteExpiresAt < new Date()) {
      await prisma.storeStaff.update({
        where: { id: staff.id },
        data: { inviteStatus: 'EXPIRED' },
      });
      throw new AppError(400, 'Cette invitation a expiré', 'INVITE_EXPIRED');
    }

    const updatedStaff = await prisma.storeStaff.update({
      where: { id: staff.id },
      data: {
        inviteStatus: 'ACCEPTED',
        acceptedAt: new Date(),
        inviteToken: null, // Supprimer le token
        isActive: true,
      },
    });

    logger.info('Staff invitation accepted', {
      staffId: staff.id,
      userId,
      storeId: staff.storeId,
    });

    return updatedStaff;
  }

  /**
   * Refuser une invitation
   */
  async rejectInvitation(userId: string, inviteToken: string): Promise<void> {
    const staff = await prisma.storeStaff.findUnique({
      where: { inviteToken },
    });

    if (!staff) {
      throw new AppError(404, 'Invitation non trouvée', 'INVITE_NOT_FOUND');
    }

    if (staff.userId !== userId) {
      throw new AppError(
        403,
        'Cette invitation ne vous est pas destinée',
        'FORBIDDEN'
      );
    }

    await prisma.storeStaff.update({
      where: { id: staff.id },
      data: {
        inviteStatus: 'REJECTED',
        inviteToken: null,
      },
    });

    logger.info('Staff invitation rejected', {
      staffId: staff.id,
      userId,
      storeId: staff.storeId,
    });
  }

  /**
   * Révoquer une invitation ou retirer un membre du staff
   */
  async removeStaff(
    requesterId: string,
    storeId: string,
    staffUserId: string
  ): Promise<void> {
    // Vérifier que le demandeur a le droit
    const canManage = await this.hasPermission(
      requesterId,
      storeId,
      'canManageStaff'
    );
    if (!canManage) {
      throw new AppError(
        403,
        "Vous n'avez pas le droit de gérer le personnel",
        'FORBIDDEN'
      );
    }

    // Vérifier que ce n'est pas le propriétaire qu'on essaie de supprimer
    const isOwner = await this.isStoreOwner(staffUserId, storeId);
    if (isOwner) {
      throw new AppError(
        400,
        'Impossible de retirer le propriétaire',
        'CANNOT_REMOVE_OWNER'
      );
    }

    const staff = await prisma.storeStaff.findUnique({
      where: {
        storeId_userId: { storeId, userId: staffUserId },
      },
    });

    if (!staff) {
      throw new AppError(
        404,
        'Membre du personnel non trouvé',
        'STAFF_NOT_FOUND'
      );
    }

    // Supprimer le staff
    await prisma.storeStaff.delete({
      where: { id: staff.id },
    });

    logger.info('Staff member removed', {
      storeId,
      requesterId,
      removedUserId: staffUserId,
    });
  }

  /**
   * Mettre à jour les informations d'un membre du staff
   */
  async updateStaff(
    requesterId: string,
    storeId: string,
    staffUserId: string,
    data: UpdateStaffDto
  ): Promise<StoreStaff> {
    // Vérifier que le demandeur a le droit
    const canManage = await this.hasPermission(
      requesterId,
      storeId,
      'canManageStaff'
    );
    if (!canManage) {
      throw new AppError(
        403,
        "Vous n'avez pas le droit de gérer le personnel",
        'FORBIDDEN'
      );
    }

    const staff = await prisma.storeStaff.findUnique({
      where: {
        storeId_userId: { storeId, userId: staffUserId },
      },
    });

    if (!staff) {
      throw new AppError(
        404,
        'Membre du personnel non trouvé',
        'STAFF_NOT_FOUND'
      );
    }

    // Si on change le rôle, appliquer les permissions par défaut du nouveau rôle
    const updateData: any = { ...data };
    if (data.role && data.role !== staff.role) {
      const newPermissions = DEFAULT_PERMISSIONS[data.role];
      updateData.canManageProducts =
        data.canManageProducts ?? newPermissions.canManageProducts;
      updateData.canManageOrders =
        data.canManageOrders ?? newPermissions.canManageOrders;
      updateData.canViewStats =
        data.canViewStats ?? newPermissions.canViewStats;
      updateData.canManageStaff =
        data.canManageStaff ?? newPermissions.canManageStaff;
      updateData.canManageDeals =
        data.canManageDeals ?? newPermissions.canManageDeals;
      updateData.canManageSettings =
        data.canManageSettings ?? newPermissions.canManageSettings;
    }

    const updatedStaff = await prisma.storeStaff.update({
      where: { id: staff.id },
      data: updateData,
    });

    logger.info('Staff member updated', {
      storeId,
      requesterId,
      staffUserId,
      changes: Object.keys(data),
    });

    return updatedStaff;
  }

  /**
   * Lister le personnel d'un magasin
   */
  async listStoreStaff(
    requesterId: string,
    storeId: string,
    filters?: {
      role?: StoreStaffRole;
      isActive?: boolean;
      inviteStatus?: StoreStaffInviteStatus;
    }
  ): Promise<StaffWithUser[]> {
    // Vérifier que le demandeur a accès
    const hasAccess = await this.hasPermission(
      requesterId,
      storeId,
      'canViewStats'
    );
    const isOwner = await this.isStoreOwner(requesterId, storeId);

    if (!hasAccess && !isOwner) {
      throw new AppError(
        403,
        "Vous n'avez pas accès à cette information",
        'FORBIDDEN'
      );
    }

    const staff = await prisma.storeStaff.findMany({
      where: {
        storeId,
        ...(filters?.role && { role: filters.role }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.inviteStatus && { inviteStatus: filters.inviteStatus }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            avatar: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return staff;
  }

  /**
   * Lister les magasins où un utilisateur est staff
   */
  async listUserStores(userId: string): Promise<
    {
      store: {
        id: string;
        name: string;
        address: string;
        city: string;
        supplier: { businessName: string };
      };
      role: StoreStaffRole;
      permissions: typeof DEFAULT_PERMISSIONS.OWNER;
    }[]
  > {
    const memberships = await prisma.storeStaff.findMany({
      where: {
        userId,
        isActive: true,
        inviteStatus: 'ACCEPTED',
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            supplier: {
              select: { businessName: true },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      store: m.store,
      role: m.role,
      permissions: {
        canManageProducts: m.canManageProducts,
        canManageOrders: m.canManageOrders,
        canViewStats: m.canViewStats,
        canManageStaff: m.canManageStaff,
        canManageDeals: m.canManageDeals,
        canManageSettings: m.canManageSettings,
      },
    }));
  }

  /**
   * Lister les invitations en attente pour un utilisateur
   */
  async listPendingInvitations(userId: string): Promise<
    {
      id: string;
      inviteToken: string;
      role: StoreStaffRole;
      invitedAt: Date;
      expiresAt: Date | null;
      store: {
        id: string;
        name: string;
        city: string;
        supplier: { businessName: string };
      };
      invitedBy: { firstName: string; lastName: string | null } | null;
    }[]
  > {
    const invitations = await prisma.storeStaff.findMany({
      where: {
        userId,
        inviteStatus: 'PENDING',
        inviteExpiresAt: { gt: new Date() },
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            city: true,
            supplier: {
              select: { businessName: true },
            },
          },
        },
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      inviteToken: inv.inviteToken!,
      role: inv.role,
      invitedAt: inv.invitedAt,
      expiresAt: inv.inviteExpiresAt,
      store: inv.store,
      invitedBy: inv.invitedBy,
    }));
  }

  /**
   * Mettre à jour la dernière activité d'un membre du staff
   */
  async updateLastActive(userId: string, storeId: string): Promise<void> {
    await prisma.storeStaff.updateMany({
      where: {
        userId,
        storeId,
        isActive: true,
        inviteStatus: 'ACCEPTED',
      },
      data: {
        lastActiveAt: new Date(),
      },
    });
  }
}

export default StoreStaffService.getInstance();
