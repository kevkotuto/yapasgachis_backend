import { Router } from 'express';
import teamMemberController from '@/api/v1/controllers/team-member.controller';
import {
  inviteTeamMemberSchema,
  updateTeamMemberSchema,
  memberIdSchema,
  teamMembersQuerySchema,
  acceptInvitationSchema,
} from '@/api/v1/validators/team-member.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// ==================== AUTHENTICATED ROUTES ====================

router.post(
  '/accept-invitation',
  authenticate,
  validate(acceptInvitationSchema),
  teamMemberController.acceptInvitation
);

// ==================== SUPPLIER ROUTES ====================

router.post(
  '/',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(inviteTeamMemberSchema),
  teamMemberController.inviteTeamMember
);

router.get(
  '/',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(teamMembersQuerySchema),
  teamMemberController.getTeamMembers
);

router.get(
  '/stats',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  teamMemberController.getTeamStats
);

router.get(
  '/:id',
  authenticate,
  validate(memberIdSchema),
  teamMemberController.getTeamMember
);

router.put(
  '/:id',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(updateTeamMemberSchema),
  teamMemberController.updateTeamMember
);

router.delete(
  '/:id',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(memberIdSchema),
  teamMemberController.deleteTeamMember
);

export default router;
