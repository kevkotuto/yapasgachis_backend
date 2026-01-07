import { Router } from 'express';

import storeStaffController from '@/api/v1/controllers/store-staff.controller';
import {
  inviteStaffSchema,
  respondInvitationSchema,
  updateStaffSchema,
  removeStaffSchema,
  listStoreStaffSchema,
  storeIdSchema,
} from '@/api/v1/validators/store-staff.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// ==================== ROUTES UTILISATEUR (mes invitations, mes magasins) ====================

/**
 * GET /api/v1/staff/my-stores
 * Lister les magasins où je suis staff
 */
router.get('/my-stores', storeStaffController.getMyStores);

/**
 * GET /api/v1/staff/invitations
 * Lister mes invitations en attente
 */
router.get('/invitations', storeStaffController.getMyInvitations);

/**
 * POST /api/v1/staff/invitations/:token/accept
 * Accepter une invitation
 */
router.post(
  '/invitations/:token/accept',
  validate(respondInvitationSchema),
  storeStaffController.acceptInvitation
);

/**
 * POST /api/v1/staff/invitations/:token/reject
 * Refuser une invitation
 */
router.post(
  '/invitations/:token/reject',
  validate(respondInvitationSchema),
  storeStaffController.rejectInvitation
);

// ==================== ROUTES MAGASIN (gestion du staff d'un magasin) ====================

/**
 * POST /api/v1/staff/stores/:storeId/invite
 * Inviter un utilisateur à rejoindre le staff
 */
router.post(
  '/stores/:storeId/invite',
  validate(inviteStaffSchema),
  storeStaffController.inviteStaff
);

/**
 * GET /api/v1/staff/stores/:storeId
 * Lister le personnel d'un magasin
 */
router.get(
  '/stores/:storeId',
  validate(listStoreStaffSchema),
  storeStaffController.listStoreStaff
);

/**
 * GET /api/v1/staff/stores/:storeId/my-role
 * Récupérer mon rôle et permissions sur un magasin
 */
router.get(
  '/stores/:storeId/my-role',
  validate(storeIdSchema),
  storeStaffController.getMyRole
);

/**
 * PATCH /api/v1/staff/stores/:storeId/members/:userId
 * Mettre à jour un membre du staff
 */
router.patch(
  '/stores/:storeId/members/:userId',
  validate(updateStaffSchema),
  storeStaffController.updateStaff
);

/**
 * DELETE /api/v1/staff/stores/:storeId/members/:userId
 * Retirer un membre du staff
 */
router.delete(
  '/stores/:storeId/members/:userId',
  validate(removeStaffSchema),
  storeStaffController.removeStaff
);

export default router;
