import { prisma } from '@/infrastructure/database/prisma';
import { AnalyticsEvent, Prisma } from '@prisma/client';
import logger from '@/infrastructure/monitoring/logger';

/**
 * Analytics Repository
 * Data access layer for analytics events and metrics
 */
export class AnalyticsRepository {
  /**
   * Track an analytics event
   */
  async trackEvent(data: {
    userId?: string;
    eventType: string;
    eventData: any;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<AnalyticsEvent> {
    try {
      return await prisma.analyticsEvent.create({
        data: {
          userId: data.userId,
          eventType: data.eventType,
          eventData: data.eventData,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
        },
      });
    } catch (error) {
      logger.error('Error tracking analytics event', {
        data,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Track multiple events in batch
   */
  async trackEventsBatch(
    events: {
      userId?: string;
      eventType: string;
      eventData: any;
      userAgent?: string;
      ipAddress?: string;
    }[]
  ): Promise<number> {
    try {
      const result = await prisma.analyticsEvent.createMany({
        data: events.map((e) => ({
          userId: e.userId,
          eventType: e.eventType,
          eventData: e.eventData,
          userAgent: e.userAgent,
          ipAddress: e.ipAddress,
        })),
      });
      return result.count;
    } catch (error) {
      logger.error('Error tracking analytics events batch', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get events by type within a date range
   */
  async getEventsByType(
    eventType: string,
    startDate: Date,
    endDate: Date,
    limit = 1000
  ): Promise<AnalyticsEvent[]> {
    try {
      return await prisma.analyticsEvent.findMany({
        where: {
          eventType,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        take: limit,
        orderBy: { timestamp: 'desc' },
      });
    } catch (error) {
      logger.error('Error getting events by type', {
        eventType,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get events count by type
   */
  async getEventCountByType(
    eventType: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      return await prisma.analyticsEvent.count({
        where: {
          eventType,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    } catch (error) {
      logger.error('Error getting event count by type', {
        eventType,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get user events
   */
  async getUserEvents(
    userId: string,
    options: {
      eventType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<AnalyticsEvent[]> {
    const { eventType, startDate, endDate, limit = 100 } = options;

    try {
      return await prisma.analyticsEvent.findMany({
        where: {
          userId,
          ...(eventType && { eventType }),
          ...(startDate &&
            endDate && {
              timestamp: {
                gte: startDate,
                lte: endDate,
              },
            }),
        },
        take: limit,
        orderBy: { timestamp: 'desc' },
      });
    } catch (error) {
      logger.error('Error getting user events', {
        userId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get events grouped by type for a date range
   */
  async getEventsGroupedByType(
    startDate: Date,
    endDate: Date
  ): Promise<{ eventType: string; count: number }[]> {
    try {
      const result = await prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: { eventType: true },
        orderBy: { _count: { eventType: 'desc' } },
      });

      return result.map((r) => ({
        eventType: r.eventType,
        count: r._count.eventType,
      }));
    } catch (error) {
      logger.error('Error getting events grouped by type', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get daily event counts for a specific event type
   */
  async getDailyEventCounts(
    eventType: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ date: string; count: number }[]> {
    try {
      const events = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE(timestamp) as date, COUNT(*) as count
        FROM "analytics_events"
        WHERE "eventType" = ${eventType}
          AND timestamp >= ${startDate}
          AND timestamp <= ${endDate}
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `;

      return events.map((e) => ({
        date: e.date,
        count: Number(e.count),
      }));
    } catch (error) {
      logger.error('Error getting daily event counts', {
        eventType,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get unique users count for an event type
   */
  async getUniqueUsersCount(
    eventType: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const result = await prisma.analyticsEvent.findMany({
        where: {
          eventType,
          userId: { not: null },
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        distinct: ['userId'],
        select: { userId: true },
      });

      return result.length;
    } catch (error) {
      logger.error('Error getting unique users count', {
        eventType,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete old events (cleanup)
   */
  async deleteOldEvents(olderThan: Date): Promise<number> {
    try {
      const result = await prisma.analyticsEvent.deleteMany({
        where: {
          timestamp: { lt: olderThan },
        },
      });
      return result.count;
    } catch (error) {
      logger.error('Error deleting old events', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get top products viewed
   */
  async getTopProductsViewed(
    startDate: Date,
    endDate: Date,
    limit = 10
  ): Promise<{ productId: string; views: number }[]> {
    try {
      const events = await prisma.$queryRaw<
        { productId: string; views: bigint }[]
      >`
        SELECT "eventData"->>'productId' as "productId", COUNT(*) as views
        FROM "analytics_events"
        WHERE "eventType" = 'product_view'
          AND timestamp >= ${startDate}
          AND timestamp <= ${endDate}
          AND "eventData"->>'productId' IS NOT NULL
        GROUP BY "eventData"->>'productId'
        ORDER BY views DESC
        LIMIT ${limit}
      `;

      return events.map((e) => ({
        productId: e.productId,
        views: Number(e.views),
      }));
    } catch (error) {
      logger.error('Error getting top products viewed', {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get top search terms
   */
  async getTopSearchTerms(
    startDate: Date,
    endDate: Date,
    limit = 20
  ): Promise<{ term: string; count: number }[]> {
    try {
      const events = await prisma.$queryRaw<{ term: string; count: bigint }[]>`
        SELECT "eventData"->>'searchTerm' as term, COUNT(*) as count
        FROM "analytics_events"
        WHERE "eventType" = 'search'
          AND timestamp >= ${startDate}
          AND timestamp <= ${endDate}
          AND "eventData"->>'searchTerm' IS NOT NULL
        GROUP BY "eventData"->>'searchTerm'
        ORDER BY count DESC
        LIMIT ${limit}
      `;

      return events.map((e) => ({
        term: e.term,
        count: Number(e.count),
      }));
    } catch (error) {
      logger.error('Error getting top search terms', {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default new AnalyticsRepository();
