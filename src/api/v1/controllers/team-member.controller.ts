import { Request, Response } from 'express';
import teamMemberService from '@/core/services/team-member.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

export class TeamMemberController {
  inviteTeamMember = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user.id;
    const member = await teamMemberService.inviteTeamMember(
      supplierId,
      req.body
    );

    logger.info('Team member invited via API', {
      supplierId,
      memberId: member.id,
    });
    res
      .status(201)
      .json({ success: true, message: 'Invitation envoyée', data: { member } });
  });

  getTeamMember = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const member = await teamMemberService.getTeamMember(id);
    res.json({ success: true, data: { member } });
  });

  getTeamMembers = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user.id;
    const result = await teamMemberService.getTeamMembers(
      supplierId,
      req.query
    );
    res.json({ success: true, data: result });
  });

  updateTeamMember = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user.id;
    const { id } = req.params;
    const member = await teamMemberService.updateTeamMember(
      supplierId,
      id,
      req.body
    );

    logger.info('Team member updated via API', { supplierId, memberId: id });
    res.json({ success: true, message: 'Membre mis à jour', data: { member } });
  });

  deleteTeamMember = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user.id;
    const { id } = req.params;
    await teamMemberService.deleteTeamMember(supplierId, id);

    logger.info('Team member deleted via API', { supplierId, memberId: id });
    res.json({ success: true, message: 'Membre supprimé' });
  });

  acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { token } = req.body;
    const member = await teamMemberService.acceptInvitation(token, userId);

    logger.info('Invitation accepted via API', { userId, memberId: member.id });
    res.json({
      success: true,
      message: 'Invitation acceptée',
      data: { member },
    });
  });

  getTeamStats = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user.id;
    const stats = await teamMemberService.getTeamStats(supplierId);
    res.json({ success: true, data: stats });
  });
}

export default new TeamMemberController();
