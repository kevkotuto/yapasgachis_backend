/**
 * KYC Repository
 * Phase 12: AI-based identity verification
 *
 * Data access layer for KYC verification operations
 */

import {
  IdCardType,
  KycCheckType,
  KycVerificationStatus,
  Prisma,
} from '@prisma/client';

import { prisma } from '@infrastructure/database';
import logger from '@infrastructure/monitoring/logger';
import {
  KycAttemptsFilter,
  KycAttemptsListOptions,
  KycExtractedDataResult,
} from '@/types/kyc.types';

export class KycRepository {
  /**
   * Create a new KYC verification attempt
   */
  async createVerificationAttempt(data: {
    supplierId: string;
    idCardFrontUrl: string;
    idCardBackUrl?: string;
    selfieUrl: string;
    idCardType: IdCardType;
    aiProvider?: string;
    autoApproveThreshold?: number;
    manualReviewThreshold?: number;
  }) {
    return prisma.kycVerificationAttempt.create({
      data: {
        supplierId: data.supplierId,
        idCardFrontUrl: data.idCardFrontUrl,
        idCardBackUrl: data.idCardBackUrl,
        selfieUrl: data.selfieUrl,
        idCardType: data.idCardType,
        aiProvider: data.aiProvider || 'aws-rekognition',
        autoApproveThreshold: data.autoApproveThreshold || 85,
        manualReviewThreshold: data.manualReviewThreshold || 60,
        status: 'PENDING',
      },
      include: {
        supplier: {
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
        },
      },
    });
  }

  /**
   * Get verification attempt by ID
   */
  async getAttemptById(attemptId: string) {
    return prisma.kycVerificationAttempt.findUnique({
      where: { id: attemptId },
      include: {
        checks: true,
        supplier: {
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
        },
      },
    });
  }

  /**
   * Get latest verification attempt for a supplier
   */
  async getLatestAttempt(supplierId: string) {
    return prisma.kycVerificationAttempt.findFirst({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
      include: {
        checks: true,
      },
    });
  }

  /**
   * Get all attempts for a supplier
   */
  async getSupplierAttempts(supplierId: string) {
    return prisma.kycVerificationAttempt.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
      include: {
        checks: true,
      },
    });
  }

  /**
   * Count attempts for a supplier
   */
  async countSupplierAttempts(supplierId: string): Promise<number> {
    return prisma.kycVerificationAttempt.count({
      where: { supplierId },
    });
  }

  /**
   * Update verification attempt status
   */
  async updateAttemptStatus(
    attemptId: string,
    status: KycVerificationStatus,
    additionalData?: {
      overallScore?: number;
      documentScore?: number;
      faceMatchScore?: number;
      livenessScore?: number;
      ocrResults?: Prisma.InputJsonValue;
      documentAnalysis?: Prisma.InputJsonValue;
      faceAnalysis?: Prisma.InputJsonValue;
      livenessAnalysis?: Prisma.InputJsonValue;
      errorCode?: string;
      errorMessage?: string;
      processingStartedAt?: Date;
      processingCompletedAt?: Date;
      processingDurationMs?: number;
      reviewedByAdminId?: string;
      reviewedAt?: Date;
      reviewNotes?: string;
    }
  ) {
    return prisma.kycVerificationAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        ...additionalData,
      },
      include: {
        checks: true,
        supplier: true,
      },
    });
  }

  /**
   * Start processing an attempt
   */
  async startProcessing(attemptId: string) {
    return prisma.kycVerificationAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'PROCESSING',
        processingStartedAt: new Date(),
      },
    });
  }

  /**
   * Complete processing with results
   */
  async completeProcessing(
    attemptId: string,
    result: {
      status: KycVerificationStatus;
      overallScore: number;
      documentScore?: number;
      faceMatchScore?: number;
      livenessScore?: number;
      ocrResults?: Prisma.InputJsonValue;
      documentAnalysis?: Prisma.InputJsonValue;
      faceAnalysis?: Prisma.InputJsonValue;
      livenessAnalysis?: Prisma.InputJsonValue;
      errorCode?: string;
      errorMessage?: string;
    }
  ) {
    const processingCompletedAt = new Date();
    const attempt = await prisma.kycVerificationAttempt.findUnique({
      where: { id: attemptId },
      select: { processingStartedAt: true },
    });

    const processingDurationMs = attempt?.processingStartedAt
      ? processingCompletedAt.getTime() -
        attempt.processingStartedAt.getTime()
      : undefined;

    return prisma.kycVerificationAttempt.update({
      where: { id: attemptId },
      data: {
        ...result,
        processingCompletedAt,
        processingDurationMs,
      },
      include: {
        checks: true,
        supplier: {
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
        },
      },
    });
  }

  /**
   * Create a verification check record
   */
  async createCheck(data: {
    attemptId: string;
    checkType: KycCheckType;
    startedAt?: Date;
  }) {
    return prisma.kycVerificationCheck.create({
      data: {
        attemptId: data.attemptId,
        checkType: data.checkType,
        startedAt: data.startedAt || new Date(),
      },
    });
  }

  /**
   * Update verification check with results
   */
  async updateCheck(
    checkId: string,
    result: {
      passed: boolean;
      score?: number;
      confidence?: number;
      result?: Prisma.InputJsonValue;
      failureReason?: string;
      completedAt?: Date;
      durationMs?: number;
    }
  ) {
    return prisma.kycVerificationCheck.update({
      where: { id: checkId },
      data: {
        ...result,
        completedAt: result.completedAt || new Date(),
      },
    });
  }

  /**
   * Save extracted data from OCR
   */
  async saveExtractedData(attemptId: string, data: KycExtractedDataResult) {
    return prisma.kycExtractedData.upsert({
      where: { attemptId },
      create: {
        attemptId,
        documentNumber: data.documentNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        placeOfBirth: data.placeOfBirth,
        gender: data.gender,
        nationality: data.nationality,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        issuingAuthority: data.issuingAuthority,
        issuingCountry: data.issuingCountry,
        address: data.address,
        extractionConfidence: data.extractionConfidence,
        isExpired: data.isExpired,
        isValid: data.isValid,
      },
      update: {
        documentNumber: data.documentNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        placeOfBirth: data.placeOfBirth,
        gender: data.gender,
        nationality: data.nationality,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        issuingAuthority: data.issuingAuthority,
        issuingCountry: data.issuingCountry,
        address: data.address,
        extractionConfidence: data.extractionConfidence,
        isExpired: data.isExpired,
        isValid: data.isValid,
      },
    });
  }

  /**
   * Get extracted data for an attempt
   */
  async getExtractedData(attemptId: string) {
    return prisma.kycExtractedData.findUnique({
      where: { attemptId },
    });
  }

  /**
   * Update supplier KYC status after verification
   */
  async updateSupplierKycStatus(
    supplierId: string,
    kycStatus: string,
    additionalData?: {
      idCardFront?: string;
      idCardBack?: string;
      selfiePhoto?: string;
      idCardType?: string;
      idCardNumber?: string;
      idCardExpiry?: Date;
      kycSubmittedAt?: Date;
      kycVerifiedAt?: Date;
      kycRejectionReason?: string;
    }
  ) {
    const updateData: Prisma.SupplierProfileUpdateInput = {
      kycStatus,
      ...additionalData,
    };

    // If verified, also update the user's kycVerified flag
    if (kycStatus === 'VERIFIED') {
      await prisma.supplierProfile.update({
        where: { id: supplierId },
        data: updateData,
        include: { user: true },
      });

      // Update user kycVerified
      const supplier = await prisma.supplierProfile.findUnique({
        where: { id: supplierId },
        select: { userId: true },
      });

      if (supplier) {
        await prisma.user.update({
          where: { id: supplier.userId },
          data: { kycVerified: true },
        });
      }

      return prisma.supplierProfile.findUnique({
        where: { id: supplierId },
        include: { user: true },
      });
    }

    return prisma.supplierProfile.update({
      where: { id: supplierId },
      data: updateData,
      include: { user: true },
    });
  }

  /**
   * Get pending review attempts with pagination
   */
  async getPendingReviewAttempts(options: KycAttemptsListOptions) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...filters
    } = options;

    const where = this.buildWhereClause({
      ...filters,
      status: 'MANUAL_REVIEW',
    });

    const [attempts, total] = await Promise.all([
      prisma.kycVerificationAttempt.findMany({
        where,
        include: {
          checks: true,
          supplier: {
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
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.kycVerificationAttempt.count({ where }),
    ]);

    return {
      data: attempts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all attempts with filters and pagination
   */
  async getAttempts(options: KycAttemptsListOptions) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...filters
    } = options;

    const where = this.buildWhereClause(filters);

    const [attempts, total] = await Promise.all([
      prisma.kycVerificationAttempt.findMany({
        where,
        include: {
          checks: true,
          supplier: {
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
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.kycVerificationAttempt.count({ where }),
    ]);

    return {
      data: attempts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get admin KYC statistics
   */
  async getAdminStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalAttempts,
      pendingReview,
      aiApproved,
      aiRejected,
      manuallyApproved,
      manuallyRejected,
      failed,
      todaySubmitted,
      todayApproved,
      todayRejected,
      todayPendingReview,
      avgProcessingTime,
      avgScore,
      byProvider,
    ] = await Promise.all([
      prisma.kycVerificationAttempt.count(),
      prisma.kycVerificationAttempt.count({
        where: { status: 'MANUAL_REVIEW' },
      }),
      prisma.kycVerificationAttempt.count({ where: { status: 'AI_APPROVED' } }),
      prisma.kycVerificationAttempt.count({ where: { status: 'AI_REJECTED' } }),
      prisma.kycVerificationAttempt.count({
        where: { status: 'MANUALLY_APPROVED' },
      }),
      prisma.kycVerificationAttempt.count({
        where: { status: 'MANUALLY_REJECTED' },
      }),
      prisma.kycVerificationAttempt.count({ where: { status: 'FAILED' } }),
      prisma.kycVerificationAttempt.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.kycVerificationAttempt.count({
        where: {
          status: { in: ['AI_APPROVED', 'MANUALLY_APPROVED'] },
          createdAt: { gte: today },
        },
      }),
      prisma.kycVerificationAttempt.count({
        where: {
          status: { in: ['AI_REJECTED', 'MANUALLY_REJECTED'] },
          createdAt: { gte: today },
        },
      }),
      prisma.kycVerificationAttempt.count({
        where: { status: 'MANUAL_REVIEW', createdAt: { gte: today } },
      }),
      prisma.kycVerificationAttempt.aggregate({
        _avg: { processingDurationMs: true },
        where: { processingDurationMs: { not: null } },
      }),
      prisma.kycVerificationAttempt.aggregate({
        _avg: { overallScore: true },
        where: { overallScore: { not: null } },
      }),
      prisma.kycVerificationAttempt.groupBy({
        by: ['aiProvider'],
        _count: true,
        _avg: { overallScore: true },
      }),
    ]);

    return {
      totalAttempts,
      pendingReview,
      aiApproved,
      aiRejected,
      manuallyApproved,
      manuallyRejected,
      failed,
      averageProcessingTimeMs: avgProcessingTime._avg.processingDurationMs || 0,
      averageScore: avgScore._avg.overallScore || 0,
      byProvider: byProvider.map((p) => ({
        provider: p.aiProvider,
        count: p._count,
        avgScore: p._avg.overallScore || 0,
      })),
      todayStats: {
        submitted: todaySubmitted,
        approved: todayApproved,
        rejected: todayRejected,
        pendingReview: todayPendingReview,
      },
    };
  }

  /**
   * Create KYC notification record
   */
  async createNotification(data: {
    supplierId: string;
    attemptId?: string;
    notificationType: string;
    title: string;
    message: string;
    pushSent?: boolean;
    emailSent?: boolean;
    smsSent?: boolean;
  }) {
    return prisma.kycNotification.create({
      data,
    });
  }

  // ==================== Helper Methods ====================

  private buildWhereClause(
    filters: KycAttemptsFilter
  ): Prisma.KycVerificationAttemptWhereInput {
    const where: Prisma.KycVerificationAttemptWhereInput = {};

    if (filters.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }

    if (filters.provider) {
      where.aiProvider = filters.provider;
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        where.createdAt.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.createdAt.lte = filters.toDate;
      }
    }

    if (filters.minScore !== undefined || filters.maxScore !== undefined) {
      where.overallScore = {};
      if (filters.minScore !== undefined) {
        where.overallScore.gte = filters.minScore;
      }
      if (filters.maxScore !== undefined) {
        where.overallScore.lte = filters.maxScore;
      }
    }

    if (filters.idCardType) {
      where.idCardType = filters.idCardType;
    }

    return where;
  }
}

// Export singleton instance
export const kycRepository = new KycRepository();
