import { PrismaClient, FrontendLog, FrontendLogLevel } from '@prisma/client';

export interface CreateFrontendLogDTO {
  level: FrontendLogLevel;
  message: string;
  timestamp?: Date;
  page?: string;
  action?: string;
  userId?: string;
  userAgent?: string;
  stack?: string;
  file?: string;
  line?: number;
  sessionId?: string;
  deviceId?: string;
  metadata?: Record<string, unknown>;
}

export interface QueryFrontendLogsDTO {
  level?: FrontendLogLevel;
  userId?: string;
  sessionId?: string;
  page?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  take?: number;
}

export class FrontendLogRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a frontend log entry
   */
  async create(data: CreateFrontendLogDTO): Promise<FrontendLog> {
    return this.prisma.frontendLog.create({
      data: {
        level: data.level,
        message: data.message,
        timestamp: data.timestamp || new Date(),
        page: data.page,
        action: data.action,
        userId: data.userId,
        userAgent: data.userAgent,
        stack: data.stack,
        file: data.file,
        line: data.line,
        sessionId: data.sessionId,
        deviceId: data.deviceId,
        metadata: data.metadata ? (data.metadata as any) : {},
      },
    });
  }

  /**
   * Query frontend logs with filters and pagination
   */
  async findMany(query: QueryFrontendLogsDTO): Promise<FrontendLog[]> {
    const where: any = {};

    if (query.level) where.level = query.level;
    if (query.userId) where.userId = query.userId;
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.page) where.page = query.page;

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = query.startDate;
      if (query.endDate) where.timestamp.lte = query.endDate;
    }

    return this.prisma.frontendLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: query.skip || 0,
      take: query.take || 20,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  /**
   * Count logs matching filters
   */
  async count(
    query: Omit<QueryFrontendLogsDTO, 'skip' | 'take'>
  ): Promise<number> {
    const where: any = {};

    if (query.level) where.level = query.level;
    if (query.userId) where.userId = query.userId;
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.page) where.page = query.page;

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = query.startDate;
      if (query.endDate) where.timestamp.lte = query.endDate;
    }

    return this.prisma.frontendLog.count({ where });
  }

  /**
   * Delete old logs (for cleanup job)
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.frontendLog.deleteMany({
      where: {
        timestamp: {
          lt: date,
        },
      },
    });
    return result.count;
  }
}

export default FrontendLogRepository;
