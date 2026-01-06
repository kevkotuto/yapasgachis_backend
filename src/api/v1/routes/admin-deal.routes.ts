import { Router } from 'express';

import dealController from '@/api/v1/controllers/deal.controller';
import {
  adminModerateDealSchema,
  adminRejectDealSchema,
} from '@/api/v1/validators/deal.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

// ==================== DEAL MODERATION ====================

// Get pending deals
router.get('/pending', dealController.getPendingDeals);

// Approve a deal
router.post(
  '/:dealId/approve',
  validate(adminModerateDealSchema),
  dealController.approveDeal
);

// Reject a deal
router.post(
  '/:dealId/reject',
  validate(adminRejectDealSchema),
  dealController.rejectDeal
);

export default router;
