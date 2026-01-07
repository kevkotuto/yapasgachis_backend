/**
 * KYC Service
 * Phase 12: AI-based identity verification
 *
 * Business logic orchestrator for KYC verification operations
 */

import { IdCardType, KycCheckType, KycVerificationStatus, Prisma } from '@prisma/client';

import config from '@config/index';
import { kycRepository } from '@core/repositories/kyc.repository';
import { prisma } from '@infrastructure/database';
import logger from '@infrastructure/monitoring/logger';
import {
  runFullVerification,
  VerificationProviderType,
} from '@infrastructure/verification';
import {
  KycErrorCode,
  KycSubmitDocumentsDto,
  KycSubmitResult,
  KycVerificationResult,
  KycStatusResponse,
  KycAdminReviewDto,
  KycAdminStats,
  KycPendingReviewItem,
  KycAttemptDetails,
  KycExtractedDataResult,
  KycAttemptsListOptions,
  KycNotificationType,
} from '@/types/kyc.types';
import { AppError } from '@middleware/error-handler.middleware';

export class KycService {
  /**
   * Submit KYC documents for verification
   */
  async submitKyc(
    supplierId: string,
    idCardFrontUrl: string,
    selfieUrl: string,
    dto: KycSubmitDocumentsDto,
    idCardBackUrl?: string
  ): Promise<KycSubmitResult> {
    logger.info('Submitting KYC documents', { supplierId, idCardType: dto.idCardType });

    // Check if supplier exists
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: supplierId },
      include: { user: true },
    });

    if (!supplier) {
      throw new AppError(404, 'Fournisseur non trouvé', KycErrorCode.SUPPLIER_NOT_FOUND);
    }

    // Check if already verified
    if (supplier.kycStatus === 'VERIFIED') {
      throw new AppError(400, 'KYC déjà vérifié', KycErrorCode.KYC_ALREADY_VERIFIED);
    }

    // Check attempt count
    const attemptCount = await kycRepository.countSupplierAttempts(supplierId);
    if (attemptCount >= config.kycVerification.maxAttemptsPerSupplier) {
      throw new AppError(
        400,
        `Nombre maximum de tentatives atteint (${config.kycVerification.maxAttemptsPerSupplier})`,
        KycErrorCode.MAX_ATTEMPTS_EXCEEDED
      );
    }

    // Check for pending verification
    const latestAttempt = await kycRepository.getLatestAttempt(supplierId);
    if (
      latestAttempt &&
      ['PENDING', 'PROCESSING'].includes(latestAttempt.status)
    ) {
      throw new AppError(
        400,
        'Une vérification est déjà en cours',
        KycErrorCode.KYC_ALREADY_PENDING
      );
    }

    // Create verification attempt
    const attempt = await kycRepository.createVerificationAttempt({
      supplierId,
      idCardFrontUrl,
      idCardBackUrl,
      selfieUrl,
      idCardType: dto.idCardType,
      aiProvider: config.kycVerification.provider,
      autoApproveThreshold: config.kycVerification.autoApproveThreshold,
      manualReviewThreshold: config.kycVerification.manualReviewThreshold,
    });

    // Update supplier status to SUBMITTED
    await kycRepository.updateSupplierKycStatus(supplierId, 'SUBMITTED', {
      idCardFront: idCardFrontUrl,
      idCardBack: idCardBackUrl,
      selfiePhoto: selfieUrl,
      idCardType: dto.idCardType,
      idCardNumber: dto.idCardNumber,
      idCardExpiry: dto.idCardExpiry,
      kycSubmittedAt: new Date(),
    });

    // Create notification for submission
    await this.createNotification(
      supplierId,
      attempt.id,
      KycNotificationType.KYC_SUBMITTED,
      'Documents KYC soumis',
      'Vos documents ont été soumis et seront vérifiés sous peu.'
    );

    // If KYC verification is enabled, process immediately or queue
    if (config.kycVerification.enabled) {
      // Process synchronously for now (can be moved to queue later)
      this.processVerification(attempt.id).catch((error) => {
        logger.error('Background KYC verification failed', {
          attemptId: attempt.id,
          error,
        });
      });
    }

    return {
      attemptId: attempt.id,
      status: attempt.status,
      message: 'Documents soumis avec succès. La vérification est en cours.',
      estimatedProcessingTime: 30, // seconds
    };
  }

  /**
   * Process KYC verification using AI
   */
  async processVerification(attemptId: string): Promise<KycVerificationResult> {
    logger.info('Processing KYC verification', { attemptId });

    const attempt = await kycRepository.getAttemptById(attemptId);
    if (!attempt) {
      throw new AppError(404, 'Tentative de vérification non trouvée');
    }

    // Mark as processing
    await kycRepository.startProcessing(attemptId);

    // Create notification for processing start
    await this.createNotification(
      attempt.supplierId,
      attemptId,
      KycNotificationType.KYC_PROCESSING,
      'Vérification en cours',
      'Vos documents sont en cours de vérification.'
    );

    try {
      // Run full verification
      const verificationResult = await runFullVerification(
        attempt.aiProvider as VerificationProviderType,
        attempt.idCardFrontUrl,
        attempt.selfieUrl,
        attempt.idCardBackUrl || undefined,
        attempt.idCardType
      );

      // Determine final status based on scores
      let finalStatus: KycVerificationStatus;
      const overallScore = verificationResult.overallScore;

      if (verificationResult.passed) {
        finalStatus = 'AI_APPROVED';
      } else if (overallScore >= config.kycVerification.manualReviewThreshold) {
        finalStatus = 'MANUAL_REVIEW';
      } else {
        finalStatus = 'AI_REJECTED';
      }

      // Save results
      const updatedAttempt = await kycRepository.completeProcessing(attemptId, {
        status: finalStatus,
        overallScore,
        documentScore: verificationResult.ocr.confidence,
        faceMatchScore: verificationResult.faceComparison.similarity,
        livenessScore: verificationResult.liveness.confidence,
        ocrResults: JSON.parse(JSON.stringify(verificationResult.ocr)) as Prisma.InputJsonValue,
        documentAnalysis: JSON.parse(JSON.stringify(verificationResult.authenticity)) as Prisma.InputJsonValue,
        faceAnalysis: JSON.parse(JSON.stringify(verificationResult.faceComparison)) as Prisma.InputJsonValue,
        livenessAnalysis: JSON.parse(JSON.stringify(verificationResult.liveness)) as Prisma.InputJsonValue,
      });

      // Save extracted data if OCR was successful
      if (verificationResult.ocr.success) {
        await this.saveExtractedDataFromOcr(attemptId, verificationResult.ocr);
      }

      // Create verification checks records
      await this.createVerificationChecks(attemptId, verificationResult);

      // Update supplier KYC status based on result
      if (finalStatus === 'AI_APPROVED') {
        await kycRepository.updateSupplierKycStatus(attempt.supplierId, 'VERIFIED', {
          kycVerifiedAt: new Date(),
        });

        await this.createNotification(
          attempt.supplierId,
          attemptId,
          KycNotificationType.KYC_APPROVED,
          'KYC Approuvé',
          'Félicitations ! Votre identité a été vérifiée avec succès.'
        );
      } else if (finalStatus === 'AI_REJECTED') {
        const rejectionReason = this.getFirstFailureReason(verificationResult);
        await kycRepository.updateSupplierKycStatus(attempt.supplierId, 'REJECTED', {
          kycRejectionReason: rejectionReason,
        });

        await this.createNotification(
          attempt.supplierId,
          attemptId,
          KycNotificationType.KYC_REJECTED,
          'KYC Rejeté',
          `Votre vérification a échoué: ${rejectionReason}. Veuillez soumettre de nouveaux documents.`
        );
      } else if (finalStatus === 'MANUAL_REVIEW') {
        await kycRepository.updateSupplierKycStatus(attempt.supplierId, 'SUBMITTED');

        await this.createNotification(
          attempt.supplierId,
          attemptId,
          KycNotificationType.KYC_MANUAL_REVIEW,
          'Vérification manuelle requise',
          'Vos documents sont en cours de vérification par notre équipe. Cela peut prendre 24-48h.'
        );
      }

      logger.info('KYC verification completed', {
        attemptId,
        status: finalStatus,
        overallScore,
      });

      return {
        attemptId,
        status: finalStatus,
        overallScore,
        documentScore: verificationResult.ocr.confidence,
        faceMatchScore: verificationResult.faceComparison.similarity,
        livenessScore: verificationResult.liveness.confidence,
        checks: this.mapToCheckResults(verificationResult),
        reviewRequired: finalStatus === 'MANUAL_REVIEW',
      };
    } catch (error) {
      logger.error('KYC verification failed', { attemptId, error });

      // Mark as failed
      await kycRepository.updateAttemptStatus(attemptId, 'FAILED', {
        errorCode: KycErrorCode.PROCESSING_TIMEOUT,
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
        processingCompletedAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * Get KYC verification status for a supplier
   */
  async getVerificationStatus(supplierId: string): Promise<KycStatusResponse> {
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new AppError(404, 'Fournisseur non trouvé');
    }

    const attemptsCount = await kycRepository.countSupplierAttempts(supplierId);
    const latestAttempt = await kycRepository.getLatestAttempt(supplierId);

    let extractedData: KycExtractedDataResult | undefined;
    if (latestAttempt) {
      const data = await kycRepository.getExtractedData(latestAttempt.id);
      if (data) {
        extractedData = {
          documentNumber: data.documentNumber || undefined,
          firstName: data.firstName || undefined,
          lastName: data.lastName || undefined,
          dateOfBirth: data.dateOfBirth || undefined,
          placeOfBirth: data.placeOfBirth || undefined,
          gender: data.gender || undefined,
          nationality: data.nationality || undefined,
          issueDate: data.issueDate || undefined,
          expiryDate: data.expiryDate || undefined,
          issuingAuthority: data.issuingAuthority || undefined,
          issuingCountry: data.issuingCountry || undefined,
          address: data.address || undefined,
          extractionConfidence: data.extractionConfidence || undefined,
          isExpired: data.isExpired || undefined,
          isValid: data.isValid || undefined,
        };
      }
    }

    // Can resubmit if not verified and not at max attempts and no pending verification
    const canResubmit =
      supplier.kycStatus !== 'VERIFIED' &&
      attemptsCount < config.kycVerification.maxAttemptsPerSupplier &&
      (!latestAttempt || !['PENDING', 'PROCESSING'].includes(latestAttempt.status));

    return {
      supplierId,
      kycStatus: supplier.kycStatus,
      latestAttempt: latestAttempt
        ? {
            attemptId: latestAttempt.id,
            status: latestAttempt.status,
            overallScore: latestAttempt.overallScore || undefined,
            submittedAt: latestAttempt.createdAt,
            processedAt: latestAttempt.processingCompletedAt || undefined,
            errorMessage: latestAttempt.errorMessage || undefined,
          }
        : undefined,
      attemptsCount,
      maxAttempts: config.kycVerification.maxAttemptsPerSupplier,
      canResubmit,
      extractedData,
    };
  }

  /**
   * Admin: Get pending review attempts
   */
  async getPendingReviewAttempts(
    options: KycAttemptsListOptions
  ): Promise<{ data: KycPendingReviewItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const result = await kycRepository.getPendingReviewAttempts(options);

    return {
      data: result.data.map((attempt) => ({
        attemptId: attempt.id,
        supplierId: attempt.supplierId,
        supplierName: attempt.supplier.businessName,
        supplierEmail: attempt.supplier.user?.email || undefined,
        supplierPhone: attempt.supplier.user?.phoneNumber || undefined,
        idCardType: attempt.idCardType,
        status: attempt.status,
        overallScore: attempt.overallScore || undefined,
        documentScore: attempt.documentScore || undefined,
        faceMatchScore: attempt.faceMatchScore || undefined,
        livenessScore: attempt.livenessScore || undefined,
        submittedAt: attempt.createdAt,
        idCardFrontUrl: attempt.idCardFrontUrl,
        idCardBackUrl: attempt.idCardBackUrl || undefined,
        selfieUrl: attempt.selfieUrl,
        errorMessage: attempt.errorMessage || undefined,
      })),
      pagination: result.pagination,
    };
  }

  /**
   * Admin: Get attempt details
   */
  async getAttemptDetails(attemptId: string): Promise<KycAttemptDetails> {
    const attempt = await kycRepository.getAttemptById(attemptId);
    if (!attempt) {
      throw new AppError(404, 'Tentative de vérification non trouvée');
    }

    const extractedData = await kycRepository.getExtractedData(attemptId);

    return {
      attemptId: attempt.id,
      supplierId: attempt.supplierId,
      supplierName: attempt.supplier.businessName,
      supplierEmail: attempt.supplier.user?.email || undefined,
      supplierPhone: attempt.supplier.user?.phoneNumber || undefined,
      idCardType: attempt.idCardType,
      status: attempt.status,
      overallScore: attempt.overallScore || undefined,
      documentScore: attempt.documentScore || undefined,
      faceMatchScore: attempt.faceMatchScore || undefined,
      livenessScore: attempt.livenessScore || undefined,
      submittedAt: attempt.createdAt,
      idCardFrontUrl: attempt.idCardFrontUrl,
      idCardBackUrl: attempt.idCardBackUrl || undefined,
      selfieUrl: attempt.selfieUrl,
      errorMessage: attempt.errorMessage || undefined,
      checks: attempt.checks.map((check) => ({
        checkType: check.checkType,
        passed: check.passed,
        score: check.score,
        confidence: check.confidence,
        failureReason: check.failureReason || undefined,
        durationMs: check.durationMs || undefined,
      })),
      ocrResults: attempt.ocrResults as any,
      documentAnalysis: attempt.documentAnalysis as any,
      faceAnalysis: attempt.faceAnalysis as any,
      livenessAnalysis: attempt.livenessAnalysis as any,
      extractedData: extractedData
        ? {
            documentNumber: extractedData.documentNumber || undefined,
            firstName: extractedData.firstName || undefined,
            lastName: extractedData.lastName || undefined,
            dateOfBirth: extractedData.dateOfBirth || undefined,
            expiryDate: extractedData.expiryDate || undefined,
            extractionConfidence: extractedData.extractionConfidence || undefined,
            isExpired: extractedData.isExpired || undefined,
            isValid: extractedData.isValid || undefined,
          }
        : undefined,
      reviewHistory: {
        reviewedByAdminId: attempt.reviewedByAdminId || undefined,
        reviewedAt: attempt.reviewedAt || undefined,
        reviewNotes: attempt.reviewNotes || undefined,
      },
      processingDurationMs: attempt.processingDurationMs || undefined,
    };
  }

  /**
   * Admin: Review and approve/reject a pending attempt
   */
  async reviewAttempt(
    attemptId: string,
    adminId: string,
    dto: KycAdminReviewDto
  ): Promise<KycVerificationResult> {
    const attempt = await kycRepository.getAttemptById(attemptId);
    if (!attempt) {
      throw new AppError(404, 'Tentative de vérification non trouvée');
    }

    if (attempt.status !== 'MANUAL_REVIEW') {
      throw new AppError(
        400,
        'Cette tentative ne nécessite pas de review manuel'
      );
    }

    const newStatus: KycVerificationStatus = dto.approve
      ? 'MANUALLY_APPROVED'
      : 'MANUALLY_REJECTED';

    // Update attempt
    await kycRepository.updateAttemptStatus(attemptId, newStatus, {
      reviewedByAdminId: adminId,
      reviewedAt: new Date(),
      reviewNotes: dto.notes,
    });

    // Update supplier status
    if (dto.approve) {
      await kycRepository.updateSupplierKycStatus(attempt.supplierId, 'VERIFIED', {
        kycVerifiedAt: new Date(),
      });

      await this.createNotification(
        attempt.supplierId,
        attemptId,
        KycNotificationType.KYC_APPROVED,
        'KYC Approuvé',
        'Félicitations ! Votre identité a été vérifiée avec succès par notre équipe.'
      );
    } else {
      await kycRepository.updateSupplierKycStatus(attempt.supplierId, 'REJECTED', {
        kycRejectionReason: dto.notes || 'Rejeté par l\'administrateur',
      });

      await this.createNotification(
        attempt.supplierId,
        attemptId,
        KycNotificationType.KYC_REJECTED,
        'KYC Rejeté',
        `Votre vérification a été rejetée. ${dto.notes || 'Veuillez soumettre de nouveaux documents.'}`
      );
    }

    logger.info('KYC review completed by admin', {
      attemptId,
      adminId,
      approved: dto.approve,
    });

    return {
      attemptId,
      status: newStatus,
      overallScore: attempt.overallScore,
      documentScore: attempt.documentScore,
      faceMatchScore: attempt.faceMatchScore,
      livenessScore: attempt.livenessScore,
      checks: [],
      reviewRequired: false,
    };
  }

  /**
   * Admin: Get KYC statistics
   */
  async getAdminStats(): Promise<KycAdminStats> {
    return kycRepository.getAdminStats();
  }

  /**
   * Admin: Force verify a supplier (bypass AI)
   */
  async forceVerify(
    supplierId: string,
    adminId: string,
    notes?: string
  ): Promise<void> {
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new AppError(404, 'Fournisseur non trouvé');
    }

    await kycRepository.updateSupplierKycStatus(supplierId, 'VERIFIED', {
      kycVerifiedAt: new Date(),
    });

    // Create audit log
    await prisma.platformSettingsAudit.create({
      data: {
        settingKey: 'KYC_FORCE_VERIFY',
        oldValue: supplier.kycStatus,
        newValue: 'VERIFIED',
        changedById: adminId,
        reason: notes || 'Vérification forcée par administrateur',
      },
    });

    await this.createNotification(
      supplierId,
      undefined,
      KycNotificationType.KYC_APPROVED,
      'KYC Approuvé',
      'Votre identité a été vérifiée par notre équipe.'
    );

    logger.info('KYC force verified by admin', { supplierId, adminId });
  }

  /**
   * Admin: Request resubmission
   */
  async requestResubmission(
    supplierId: string,
    reason: string
  ): Promise<void> {
    await kycRepository.updateSupplierKycStatus(supplierId, 'PENDING', {
      kycRejectionReason: reason,
    });

    await this.createNotification(
      supplierId,
      undefined,
      KycNotificationType.KYC_RESUBMIT_REQUIRED,
      'Nouvelle soumission requise',
      `Veuillez soumettre de nouveaux documents: ${reason}`
    );

    logger.info('KYC resubmission requested', { supplierId, reason });
  }

  // ==================== Helper Methods ====================

  private async createNotification(
    supplierId: string,
    attemptId: string | undefined,
    type: KycNotificationType,
    title: string,
    message: string
  ): Promise<void> {
    try {
      await kycRepository.createNotification({
        supplierId,
        attemptId,
        notificationType: type,
        title,
        message,
      });
    } catch (error) {
      logger.error('Failed to create KYC notification', {
        supplierId,
        type,
        error,
      });
    }
  }

  private async saveExtractedDataFromOcr(
    attemptId: string,
    ocrResult: any
  ): Promise<void> {
    const fields = ocrResult.extractedFields || {};

    const extractedData: KycExtractedDataResult = {
      documentNumber: fields.documentNumber?.value,
      firstName: fields.firstName?.value,
      lastName: fields.lastName?.value,
      dateOfBirth: fields.dateOfBirth?.value
        ? new Date(fields.dateOfBirth.value)
        : undefined,
      placeOfBirth: fields.placeOfBirth?.value,
      gender: fields.gender?.value,
      nationality: fields.nationality?.value,
      issueDate: fields.issueDate?.value
        ? new Date(fields.issueDate.value)
        : undefined,
      expiryDate: fields.expiryDate?.value
        ? new Date(fields.expiryDate.value)
        : undefined,
      issuingAuthority: fields.issuingAuthority?.value,
      issuingCountry: fields.issuingCountry?.value,
      address: fields.address?.value,
      extractionConfidence: ocrResult.confidence,
      isExpired: fields.expiryDate?.value
        ? new Date(fields.expiryDate.value) < new Date()
        : undefined,
      isValid: ocrResult.success,
    };

    await kycRepository.saveExtractedData(attemptId, extractedData);
  }

  private async createVerificationChecks(
    attemptId: string,
    result: any
  ): Promise<void> {
    // OCR Check
    const ocrCheck = await kycRepository.createCheck({
      attemptId,
      checkType: 'DOCUMENT_OCR',
    });
    await kycRepository.updateCheck(ocrCheck.id, {
      passed: result.ocr.success,
      score: result.ocr.confidence,
      confidence: result.ocr.confidence,
      result: result.ocr,
    });

    // Face Match Check
    const faceCheck = await kycRepository.createCheck({
      attemptId,
      checkType: 'FACE_MATCH',
    });
    await kycRepository.updateCheck(faceCheck.id, {
      passed: result.faceComparison.isMatch,
      score: result.faceComparison.similarity,
      confidence: result.faceComparison.confidence,
      result: result.faceComparison,
      failureReason: result.faceComparison.isMatch
        ? undefined
        : 'Face mismatch detected',
    });

    // Liveness Check
    const livenessCheck = await kycRepository.createCheck({
      attemptId,
      checkType: 'LIVENESS_DETECTION',
    });
    await kycRepository.updateCheck(livenessCheck.id, {
      passed: result.liveness.isLive,
      score: result.liveness.confidence,
      confidence: result.liveness.confidence,
      result: result.liveness,
      failureReason: result.liveness.isLive
        ? undefined
        : `Liveness failed: ${result.liveness.spoofType || 'unknown'}`,
    });

    // Authenticity Check
    const authCheck = await kycRepository.createCheck({
      attemptId,
      checkType: 'DOCUMENT_AUTHENTICITY',
    });
    await kycRepository.updateCheck(authCheck.id, {
      passed: result.authenticity.isAuthentic,
      score: result.authenticity.confidence,
      confidence: result.authenticity.confidence,
      result: result.authenticity,
      failureReason: result.authenticity.isAuthentic
        ? undefined
        : result.authenticity.warnings?.join(', '),
    });
  }

  private mapToCheckResults(result: any): any[] {
    return [
      {
        checkType: 'DOCUMENT_OCR' as KycCheckType,
        passed: result.ocr.success,
        score: result.ocr.confidence,
        confidence: result.ocr.confidence,
      },
      {
        checkType: 'FACE_MATCH' as KycCheckType,
        passed: result.faceComparison.isMatch,
        score: result.faceComparison.similarity,
        confidence: result.faceComparison.confidence,
        failureReason: result.faceComparison.isMatch ? undefined : 'Face mismatch',
      },
      {
        checkType: 'LIVENESS_DETECTION' as KycCheckType,
        passed: result.liveness.isLive,
        score: result.liveness.confidence,
        confidence: result.liveness.confidence,
        failureReason: result.liveness.isLive ? undefined : result.liveness.spoofType,
      },
      {
        checkType: 'DOCUMENT_AUTHENTICITY' as KycCheckType,
        passed: result.authenticity.isAuthentic,
        score: result.authenticity.confidence,
        confidence: result.authenticity.confidence,
      },
    ];
  }

  private getFirstFailureReason(result: any): string {
    if (!result.ocr.success) return 'Document illisible ou invalide';
    if (!result.faceComparison.isMatch) return 'Le visage ne correspond pas au document';
    if (!result.liveness.isLive) return 'Échec de la détection de vivacité';
    if (!result.authenticity.isAuthentic)
      return result.authenticity.warnings?.[0] || 'Document non authentique';
    return 'Vérification échouée';
  }
}

// Export singleton instance
export const kycService = new KycService();
