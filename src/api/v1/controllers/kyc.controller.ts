/**
 * KYC Controller
 * Phase 12: AI-based identity verification
 *
 * HTTP handlers for KYC verification endpoints
 */

import { Request, Response } from 'express';

import { kycService } from '@core/services/kyc.service';
import { prisma } from '@infrastructure/database';
import logger from '@infrastructure/monitoring/logger';
import { getKycQueueStats } from '@infrastructure/queue/queues/kyc.queue';
import { AppError } from '@middleware/error-handler.middleware';
import { asyncHandler } from '@utils/helpers';
import { IdCardType } from '@prisma/client';

// ==================== Supplier Endpoints ====================

/**
 * @swagger
 * /api/v1/kyc/submit:
 *   post:
 *     summary: Submit KYC documents for verification
 *     tags: [KYC - Supplier]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - idCardFront
 *               - selfie
 *               - idCardType
 *             properties:
 *               idCardFront:
 *                 type: string
 *                 format: binary
 *                 description: Front of ID card
 *               idCardBack:
 *                 type: string
 *                 format: binary
 *                 description: Back of ID card (optional)
 *               selfie:
 *                 type: string
 *                 format: binary
 *                 description: Selfie photo for face verification
 *               idCardType:
 *                 type: string
 *                 enum: [CNI, PASSPORT, DRIVING_LICENSE, RESIDENCE_CARD]
 *               idCardNumber:
 *                 type: string
 *               idCardExpiry:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: KYC documents submitted successfully
 *       400:
 *         description: Invalid input or KYC already verified
 *       401:
 *         description: Unauthorized
 */
export const submitKyc = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(401, 'Non autorisé');
  }

  // Get supplier profile
  const supplier = await prisma.supplierProfile.findUnique({
    where: { userId },
  });

  if (!supplier) {
    throw new AppError(404, 'Profil fournisseur non trouvé');
  }

  // Get uploaded file URLs (assuming files were uploaded to Cloudinary via middleware)
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!files?.idCardFront?.[0] || !files?.selfie?.[0]) {
    throw new AppError(400, 'Pièce d\'identité et selfie requis');
  }

  // Get Cloudinary URLs from uploaded files
  const idCardFrontUrl = (files.idCardFront[0] as any).path || files.idCardFront[0].filename;
  const idCardBackUrl = files.idCardBack?.[0]
    ? (files.idCardBack[0] as any).path || files.idCardBack[0].filename
    : undefined;
  const selfieUrl = (files.selfie[0] as any).path || files.selfie[0].filename;

  const { idCardType, idCardNumber, idCardExpiry } = req.body;

  const result = await kycService.submitKyc(
    supplier.id,
    idCardFrontUrl,
    selfieUrl,
    {
      idCardType: idCardType as IdCardType,
      idCardNumber,
      idCardExpiry: idCardExpiry ? new Date(idCardExpiry) : undefined,
    },
    idCardBackUrl
  );

  res.status(200).json({
    success: true,
    message: result.message,
    data: {
      attemptId: result.attemptId,
      status: result.status,
      estimatedProcessingTime: result.estimatedProcessingTime,
    },
  });
});

/**
 * @swagger
 * /api/v1/kyc/status:
 *   get:
 *     summary: Get KYC verification status
 *     tags: [KYC - Supplier]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status retrieved successfully
 *       401:
 *         description: Unauthorized
 */
export const getKycStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(401, 'Non autorisé');
  }

  // Get supplier profile
  const supplier = await prisma.supplierProfile.findUnique({
    where: { userId },
  });

  if (!supplier) {
    throw new AppError(404, 'Profil fournisseur non trouvé');
  }

  const status = await kycService.getVerificationStatus(supplier.id);

  res.status(200).json({
    success: true,
    data: status,
  });
});

// ==================== Admin Endpoints ====================

/**
 * @swagger
 * /api/v1/admin/kyc/pending:
 *   get:
 *     summary: Get pending KYC reviews
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Pending reviews retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
export const getPendingReviews = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await kycService.getPendingReviewAttempts({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      sortBy: sortBy as 'createdAt' | 'overallScore' | 'processingDurationMs',
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  }
);

/**
 * @swagger
 * /api/v1/admin/kyc/attempts:
 *   get:
 *     summary: Get all KYC attempts with filters
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attempts retrieved successfully
 */
export const getAttempts = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '20',
    status,
    supplierId,
    provider,
    fromDate,
    toDate,
    minScore,
    maxScore,
    idCardType,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const result = await kycService.getPendingReviewAttempts({
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
    status: status ? (status as string).split(',') as any : undefined,
    supplierId: supplierId as string,
    provider: provider as string,
    fromDate: fromDate ? new Date(fromDate as string) : undefined,
    toDate: toDate ? new Date(toDate as string) : undefined,
    minScore: minScore ? parseFloat(minScore as string) : undefined,
    maxScore: maxScore ? parseFloat(maxScore as string) : undefined,
    idCardType: idCardType as IdCardType,
    sortBy: sortBy as 'createdAt' | 'overallScore' | 'processingDurationMs',
    sortOrder: sortOrder as 'asc' | 'desc',
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * @swagger
 * /api/v1/admin/kyc/attempts/{attemptId}:
 *   get:
 *     summary: Get KYC attempt details
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attempt details retrieved successfully
 *       404:
 *         description: Attempt not found
 */
export const getAttemptDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { attemptId } = req.params;

    const details = await kycService.getAttemptDetails(attemptId);

    res.status(200).json({
      success: true,
      data: details,
    });
  }
);

/**
 * @swagger
 * /api/v1/admin/kyc/attempts/{attemptId}/review:
 *   post:
 *     summary: Review and approve/reject a KYC attempt
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approve
 *             properties:
 *               approve:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review completed successfully
 *       400:
 *         description: Invalid attempt status
 *       404:
 *         description: Attempt not found
 */
export const reviewAttempt = asyncHandler(
  async (req: Request, res: Response) => {
    const { attemptId } = req.params;
    const { approve, notes } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      throw new AppError(401, 'Non autorisé');
    }

    const result = await kycService.reviewAttempt(attemptId, adminId, {
      approve,
      notes,
    });

    res.status(200).json({
      success: true,
      message: approve ? 'KYC approuvé avec succès' : 'KYC rejeté',
      data: result,
    });
  }
);

/**
 * @swagger
 * /api/v1/admin/kyc/suppliers/{supplierId}/force-verify:
 *   post:
 *     summary: Force verify a supplier (bypass AI)
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Supplier verified successfully
 *       404:
 *         description: Supplier not found
 */
export const forceVerify = asyncHandler(async (req: Request, res: Response) => {
  const { supplierId } = req.params;
  const { notes } = req.body;
  const adminId = req.user?.id;

  if (!adminId) {
    throw new AppError(401, 'Non autorisé');
  }

  await kycService.forceVerify(supplierId, adminId, notes);

  res.status(200).json({
    success: true,
    message: 'Fournisseur vérifié avec succès',
  });
});

/**
 * @swagger
 * /api/v1/admin/kyc/suppliers/{supplierId}/request-resubmission:
 *   post:
 *     summary: Request document resubmission
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: supplierId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resubmission requested successfully
 *       404:
 *         description: Supplier not found
 */
export const requestResubmission = asyncHandler(
  async (req: Request, res: Response) => {
    const { supplierId } = req.params;
    const { reason } = req.body;

    await kycService.requestResubmission(supplierId, reason);

    res.status(200).json({
      success: true,
      message: 'Demande de nouvelle soumission envoyée',
    });
  }
);

/**
 * @swagger
 * /api/v1/admin/kyc/stats:
 *   get:
 *     summary: Get KYC statistics
 *     tags: [KYC - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const [kycStats, queueStats] = await Promise.all([
    kycService.getAdminStats(),
    getKycQueueStats(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...kycStats,
      queue: queueStats,
    },
  });
});
