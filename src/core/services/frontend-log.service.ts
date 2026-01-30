import { FrontendLog, FrontendLogLevel } from '@prisma/client';

import {
  FrontendLogRepository,
  CreateFrontendLogDTO,
  QueryFrontendLogsDTO,
} from '@/core/repositories/frontend-log.repository';
import { prisma } from '@/infrastructure/database/prisma';
import logger, { frontendLogger } from '@/infrastructure/monitoring/logger';

export class FrontendLogService {
  private repository: FrontendLogRepository;

  constructor() {
    this.repository = new FrontendLogRepository(prisma);
  }

  /**
   * Log frontend event
   * - ERROR level → Save to database + Winston file
   * - ALL levels → Save to Winston file
   */
  async logEvent(data: CreateFrontendLogDTO): Promise<void> {
    try {
      // Always log to Winston frontend file
      this.logToWinston(data);

      // Only save ERROR logs to database
      if (data.level === FrontendLogLevel.ERROR) {
        await this.repository.create(data);
      }
    } catch (error) {
      // Don't fail the request if logging fails
      logger.error('Failed to save frontend log', {
        error: error instanceof Error ? error.message : 'Unknown error',
        logData: data,
      });
    }
  }

  /**
   * Write to Winston frontend log file
   */
  private logToWinston(data: CreateFrontendLogDTO): void {
    const logEntry = {
      level: data.level.toLowerCase(),
      message: data.message,
      timestamp: data.timestamp || new Date(),
      context: {
        page: data.page,
        action: data.action,
        userId: data.userId,
        sessionId: data.sessionId,
        deviceId: data.deviceId,
      },
      technical: {
        userAgent: data.userAgent,
        file: data.file,
        line: data.line,
        stack: data.stack,
      },
      metadata: data.metadata,
    };

    // Use the dedicated frontend logger
    frontendLogger.log(logEntry.level as any, logEntry.message, logEntry);
  }

  /**
   * Query logs (for admin dashboard)
   */
  async queryLogs(query: QueryFrontendLogsDTO): Promise<{
    logs: FrontendLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = ((query.skip || 1) - 1) * (query.take || 20);

    const [logs, total] = await Promise.all([
      this.repository.findMany({ ...query, skip, take: query.take }),
      this.repository.count(query),
    ]);

    return {
      logs,
      total,
      page: query.skip || 1,
      limit: query.take || 20,
    };
  }

  /**
   * Cleanup old logs (called from cron)
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deletedCount = await this.repository.deleteOlderThan(cutoffDate);

    logger.info('Frontend logs cleanup completed', {
      deletedCount,
      cutoffDate: cutoffDate.toISOString(),
    });

    return deletedCount;
  }
}

export default new FrontendLogService();
