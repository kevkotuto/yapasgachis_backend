import { Request, Response } from 'express';

import storeStaffService from '@/core/services/store-staff.service';

/**
 * Store Staff Controller
 * Gère les endpoints pour la gestion du personnel des magasins
 */

/**
 * POST /api/v1/stores/:storeId/staff/invite
 * Inviter un utilisateur à rejoindre le staff
 */
export const inviteStaff = async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const inviterId = req.user!.id;
  const { email, phoneNumber, role, customPermissions, notes } = req.body;

  const staff = await storeStaffService.inviteStaff(inviterId, {
    storeId,
    email,
    phoneNumber,
    role,
    customPermissions,
    notes,
  });

  res.status(201).json({
    success: true,
    message: 'Invitation envoyée avec succès',
    data: {
      id: staff.id,
      role: staff.role,
      inviteStatus: staff.inviteStatus,
      inviteExpiresAt: staff.inviteExpiresAt,
    },
  });
};

/**
 * POST /api/v1/staff/invitations/:token/accept
 * Accepter une invitation
 */
export const acceptInvitation = async (req: Request, res: Response) => {
  const { token } = req.params;
  const userId = req.user!.id;

  const staff = await storeStaffService.acceptInvitation(userId, token);

  res.json({
    success: true,
    message: 'Invitation acceptée avec succès',
    data: {
      id: staff.id,
      storeId: staff.storeId,
      role: staff.role,
    },
  });
};

/**
 * POST /api/v1/staff/invitations/:token/reject
 * Refuser une invitation
 */
export const rejectInvitation = async (req: Request, res: Response) => {
  const { token } = req.params;
  const userId = req.user!.id;

  await storeStaffService.rejectInvitation(userId, token);

  res.json({
    success: true,
    message: 'Invitation refusée',
  });
};

/**
 * GET /api/v1/stores/:storeId/staff
 * Lister le personnel d'un magasin
 */
export const listStoreStaff = async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const requesterId = req.user!.id;
  const { role, isActive, inviteStatus } = req.query;

  const staff = await storeStaffService.listStoreStaff(requesterId, storeId, {
    role: role as any,
    isActive: isActive as any,
    inviteStatus: inviteStatus as any,
  });

  res.json({
    success: true,
    data: staff,
  });
};

/**
 * PATCH /api/v1/stores/:storeId/staff/:userId
 * Mettre à jour un membre du staff
 */
export const updateStaff = async (req: Request, res: Response) => {
  const { storeId, userId } = req.params;
  const requesterId = req.user!.id;

  const staff = await storeStaffService.updateStaff(
    requesterId,
    storeId,
    userId,
    req.body
  );

  res.json({
    success: true,
    message: 'Membre du personnel mis à jour',
    data: staff,
  });
};

/**
 * DELETE /api/v1/stores/:storeId/staff/:userId
 * Retirer un membre du staff
 */
export const removeStaff = async (req: Request, res: Response) => {
  const { storeId, userId } = req.params;
  const requesterId = req.user!.id;

  await storeStaffService.removeStaff(requesterId, storeId, userId);

  res.json({
    success: true,
    message: 'Membre du personnel retiré',
  });
};

/**
 * GET /api/v1/staff/my-stores
 * Lister les magasins où l'utilisateur est staff
 */
export const getMyStores = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const stores = await storeStaffService.listUserStores(userId);

  res.json({
    success: true,
    data: stores,
  });
};

/**
 * GET /api/v1/staff/invitations
 * Lister mes invitations en attente
 */
export const getMyInvitations = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const invitations = await storeStaffService.listPendingInvitations(userId);

  res.json({
    success: true,
    data: invitations,
  });
};

/**
 * GET /api/v1/stores/:storeId/my-role
 * Récupérer mon rôle et permissions sur un magasin
 */
export const getMyRole = async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = req.user!.id;

  const roleInfo = await storeStaffService.getStaffRole(userId, storeId);

  if (!roleInfo) {
    res.json({
      success: true,
      data: {
        hasAccess: false,
        role: null,
        permissions: null,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      hasAccess: true,
      ...roleInfo,
    },
  });
};

export default {
  inviteStaff,
  acceptInvitation,
  rejectInvitation,
  listStoreStaff,
  updateStaff,
  removeStaff,
  getMyStores,
  getMyInvitations,
  getMyRole,
};
