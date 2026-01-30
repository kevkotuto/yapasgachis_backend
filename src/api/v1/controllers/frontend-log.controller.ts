import { Request, Response } from 'express';
import { FrontendLogLevel } from '@prisma/client';

import frontendLogService from '@/core/services/frontend-log.service';
import type {
  CreateFrontendLogInput,
  QueryFrontendLogsInput,
} from '@/api/v1/validators/frontend-log.validator';
import { asyncHandler } from '@/utils/helpers';

/**
 * FrontendLogController - Handles frontend logging HTTP requests
 */
export class FrontendLogController {
  /**
   * Create a frontend log entry
   * POST /api/v1/logs
   *
   * Optional authentication - uses optionalAuthMiddleware
   */
  createLog = asyncHandler(
    async (
      req: Request<object, object, CreateFrontendLogInput>,
      res: Response
    ) => {
      const {
        message,
        level,
        timestamp,
        page,
        action,
        userAgent,
        stack,
        file,
        line,
        sessionId,
        deviceId,
        metadata,
      } = req.body;

      // Extract userId from JWT if authenticated
      const userId = req.user?.id;

      // Map string level to enum
      const logLevel = level.toUpperCase() as FrontendLogLevel;

      // Log the event (service handles database + Winston)
      await frontendLogService.logEvent({
        level: logLevel,
        message,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        page,
        action,
        userId,
        userAgent: userAgent || req.get('user-agent'),
        stack,
        file,
        line,
        sessionId,
        deviceId,
        metadata,
      });

      // Return 201 Created immediately
      res.status(201).json({
        success: true,
        message: 'Log enregistré avec succès',
      });
    }
  );

  /**
   * Query frontend logs (admin only)
   * GET /api/v1/logs
   */
  queryLogs = asyncHandler(
    async (
      req: Request<object, object, object, QueryFrontendLogsInput>,
      res: Response
    ) => {
      const {
        level,
        userId,
        sessionId,
        pageFilter,
        startDate,
        endDate,
        page: pageNum,
        limit,
      } = req.query;

      const result = await frontendLogService.queryLogs({
        level: level ? (level.toUpperCase() as FrontendLogLevel) : undefined,
        userId,
        sessionId,
        page: pageFilter,
        startDate,
        endDate,
        skip: pageNum,
        take: limit,
      });

      res.json({
        success: true,
        data: result,
      });
    }
  );
}

export default new FrontendLogController();
