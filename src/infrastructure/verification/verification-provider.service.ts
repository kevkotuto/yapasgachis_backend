/**
 * Verification Provider Factory
 * Phase 12: AI-based identity verification
 *
 * Provides a unified interface for different verification providers
 * (AWS Rekognition, Azure, Google, Mock)
 */

import { IdCardType } from '@prisma/client';

import config from '@config/index';
import logger from '@infrastructure/monitoring/logger';
import {
  DocumentOcrResult,
  FaceComparisonResult,
  LivenessDetectionResult,
  DocumentAuthenticityResult,
} from '@/types/kyc.types';

import { awsRekognitionService } from './aws-rekognition.service';
import { mockVerificationService } from './mock-verification.service';

export interface IVerificationProvider {
  extractDocumentData(
    idCardFrontUrl: string,
    idCardBackUrl?: string,
    idCardType?: IdCardType
  ): Promise<DocumentOcrResult>;

  compareFaces(
    idCardFrontUrl: string,
    selfieUrl: string
  ): Promise<FaceComparisonResult>;

  detectLiveness(selfieUrl: string): Promise<LivenessDetectionResult>;

  analyzeDocumentAuthenticity(
    idCardFrontUrl: string,
    idCardBackUrl?: string,
    extractedData?: DocumentOcrResult
  ): Promise<DocumentAuthenticityResult>;
}

export type VerificationProviderType =
  | 'aws-rekognition'
  | 'azure'
  | 'google'
  | 'mock';

class VerificationProviderFactory {
  private providers: Map<VerificationProviderType, IVerificationProvider> =
    new Map();

  constructor() {
    // Register providers
    this.providers.set('aws-rekognition', {
      extractDocumentData: (front, back) =>
        awsRekognitionService.extractDocumentData(front, back),
      compareFaces: (id, selfie) =>
        awsRekognitionService.compareFaces(id, selfie),
      detectLiveness: (selfie) => awsRekognitionService.detectLiveness(selfie),
      analyzeDocumentAuthenticity: (front, back, data) =>
        awsRekognitionService.analyzeDocumentAuthenticity(front, back, data),
    });

    this.providers.set('mock', {
      extractDocumentData: (front, back, type) =>
        mockVerificationService.extractDocumentData(front, back, type),
      compareFaces: (id, selfie) =>
        mockVerificationService.compareFaces(id, selfie),
      detectLiveness: (selfie) =>
        mockVerificationService.detectLiveness(selfie),
      analyzeDocumentAuthenticity: (front, back, data) =>
        mockVerificationService.analyzeDocumentAuthenticity(front, back, data),
    });

    // Azure and Google providers can be added similarly
    // For now, they fall back to mock in development
    this.providers.set('azure', this.providers.get('mock')!);
    this.providers.set('google', this.providers.get('mock')!);
  }

  getProvider(type?: VerificationProviderType): IVerificationProvider {
    const providerType = type || config.kycVerification.provider;

    // In development without AWS credentials, use mock
    if (
      config.app.env === 'development' &&
      providerType === 'aws-rekognition' &&
      (!config.aws.accessKeyId || !config.aws.secretAccessKey)
    ) {
      logger.warn(
        'AWS credentials not configured, falling back to mock provider'
      );
      return this.providers.get('mock')!;
    }

    const provider = this.providers.get(providerType);
    if (!provider) {
      logger.warn(`Unknown provider: ${providerType}, using mock`);
      return this.providers.get('mock')!;
    }

    return provider;
  }

  /**
   * Run all verification checks using the configured provider
   */
  async runFullVerification(
    provider: VerificationProviderType,
    idCardFrontUrl: string,
    selfieUrl: string,
    idCardBackUrl?: string,
    idCardType?: IdCardType
  ): Promise<{
    ocr: DocumentOcrResult;
    faceComparison: FaceComparisonResult;
    liveness: LivenessDetectionResult;
    authenticity: DocumentAuthenticityResult;
    overallScore: number;
    passed: boolean;
  }> {
    const verificationProvider = this.getProvider(provider);
    const startTime = Date.now();

    logger.info('Starting full KYC verification', {
      provider,
      hasBackImage: !!idCardBackUrl,
      idCardType,
    });

    // Run all checks in parallel for efficiency
    const [ocr, faceComparison, liveness] = await Promise.all([
      verificationProvider.extractDocumentData(
        idCardFrontUrl,
        idCardBackUrl,
        idCardType
      ),
      verificationProvider.compareFaces(idCardFrontUrl, selfieUrl),
      verificationProvider.detectLiveness(selfieUrl),
    ]);

    // Run authenticity check with OCR results
    const authenticity = await verificationProvider.analyzeDocumentAuthenticity(
      idCardFrontUrl,
      idCardBackUrl,
      ocr
    );

    // Calculate overall score
    const scores = {
      ocr: ocr.success ? ocr.confidence : 0,
      face: faceComparison.success ? faceComparison.similarity : 0,
      liveness: liveness.success ? liveness.confidence : 0,
      authenticity: authenticity.success ? authenticity.confidence : 0,
    };

    // Weighted average
    const weights = {
      ocr: 0.2,
      face: 0.35,
      liveness: 0.25,
      authenticity: 0.2,
    };

    const overallScore =
      scores.ocr * weights.ocr +
      scores.face * weights.face +
      scores.liveness * weights.liveness +
      scores.authenticity * weights.authenticity;

    // Determine if passed based on thresholds
    const passed =
      ocr.success &&
      faceComparison.success &&
      faceComparison.isMatch &&
      liveness.success &&
      liveness.isLive &&
      authenticity.success &&
      authenticity.isAuthentic &&
      overallScore >= config.kycVerification.autoApproveThreshold;

    const duration = Date.now() - startTime;
    logger.info('Full KYC verification completed', {
      provider,
      overallScore,
      passed,
      durationMs: duration,
      scores,
    });

    return {
      ocr,
      faceComparison,
      liveness,
      authenticity,
      overallScore,
      passed,
    };
  }
}

// Export singleton factory
export const verificationProviderFactory = new VerificationProviderFactory();

// Export convenience functions
export function getVerificationProvider(
  type?: VerificationProviderType
): IVerificationProvider {
  return verificationProviderFactory.getProvider(type);
}

export async function runFullVerification(
  provider: VerificationProviderType,
  idCardFrontUrl: string,
  selfieUrl: string,
  idCardBackUrl?: string,
  idCardType?: IdCardType
) {
  return verificationProviderFactory.runFullVerification(
    provider,
    idCardFrontUrl,
    selfieUrl,
    idCardBackUrl,
    idCardType
  );
}
