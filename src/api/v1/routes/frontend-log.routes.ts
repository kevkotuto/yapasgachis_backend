import { Router } from 'express';

import frontendLogController from '../controllers/frontend-log.controller';
import {
  createFrontendLogSchema,
  queryFrontendLogsSchema,
} from '../validators/frontend-log.validator';

import {
  optionalAuthMiddleware,
  authMiddleware,
} from '@/middleware/auth.middleware';
import { roleGuard } from '@/middleware/role-guard.middleware';
import { validate } from '@/middleware/validation.middleware';
import { UserRole } from '@/utils/enums';

const router: Router = Router();

// ==================== FRONTEND LOG ENDPOINTS ====================

/**
 * Create frontend log
 * POST /api/v1/logs
 *
 * Optional authentication - works with or without JWT token
 * Rate limit: Uses global writeLimiter (100 req/15min)
 */
router.post(
  '/',
  optionalAuthMiddleware,
  validate(createFrontendLogSchema),
  frontendLogController.createLog
);

/**
 * Query frontend logs (admin only)
 * GET /api/v1/logs
 *
 * For future log browsing dashboard
 */
router.get(
  '/',
  authMiddleware,
  roleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate(queryFrontendLogsSchema),
  frontendLogController.queryLogs
);

export default router;
