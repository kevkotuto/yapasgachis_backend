/**
 * Mock Verification Service for Development/Testing
 * Phase 12: AI-based identity verification
 *
 * Simulates AI verification responses for testing without hitting real APIs
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

export class MockVerificationService {
  private simulateDelay = config.app.env === 'development';
  private minDelay = 500; // ms
  private maxDelay = 2000; // ms

  /**
   * Simulate document OCR extraction
   */
  async extractDocumentData(
    idCardFrontUrl: string,
    idCardBackUrl?: string,
    idCardType?: IdCardType
  ): Promise<DocumentOcrResult> {
    await this.delay();

    logger.info('[MOCK] Extracting document data', {
      frontUrl: idCardFrontUrl,
      hasBack: !!idCardBackUrl,
      type: idCardType,
    });

    // Generate random but realistic scores
    const confidence = this.randomScore(75, 98);

    // Generate mock extracted data based on document type
    const mockData = this.generateMockExtractedData(idCardType);

    return {
      success: true,
      confidence,
      extractedFields: mockData.fields,
      documentType: idCardType || 'CNI',
      documentQuality: {
        overall: this.randomScore(70, 95),
        brightness: this.randomScore(60, 90),
        sharpness: this.randomScore(65, 95),
        glare: this.randomScore(5, 25),
      },
      rawResponse: { mock: true },
    };
  }

  /**
   * Simulate face comparison
   */
  async compareFaces(
    idCardFrontUrl: string,
    selfieUrl: string
  ): Promise<FaceComparisonResult> {
    await this.delay();

    logger.info('[MOCK] Comparing faces', {
      idCardUrl: idCardFrontUrl,
      selfieUrl,
    });

    // Simulate various outcomes based on URL patterns for testing
    const shouldMatch = !selfieUrl.includes('mismatch');
    const similarity = shouldMatch
      ? this.randomScore(80, 99)
      : this.randomScore(20, 60);

    return {
      success: true,
      similarity,
      confidence: this.randomScore(85, 99),
      sourceFace: {
        detected: true,
        quality: this.randomScore(70, 95),
        boundingBox: {
          left: 0.15,
          top: 0.1,
          width: 0.3,
          height: 0.4,
        },
      },
      targetFace: {
        detected: true,
        quality: this.randomScore(75, 98),
        boundingBox: {
          left: 0.25,
          top: 0.15,
          width: 0.4,
          height: 0.5,
        },
      },
      isMatch: similarity >= config.kycVerification.faceSimilarityThreshold,
      rawResponse: { mock: true },
    };
  }

  /**
   * Simulate liveness detection
   */
  async detectLiveness(selfieUrl: string): Promise<LivenessDetectionResult> {
    await this.delay();

    logger.info('[MOCK] Detecting liveness', { selfieUrl });

    // Simulate failure for testing if URL contains specific patterns
    const isSpoofTest = selfieUrl.includes('spoof');
    const confidence = isSpoofTest
      ? this.randomScore(20, 50)
      : this.randomScore(75, 98);

    return {
      success: true,
      isLive: confidence >= config.kycVerification.livenessThreshold,
      confidence,
      spoofType: isSpoofTest ? 'photo' : undefined,
      rawResponse: { mock: true },
    };
  }

  /**
   * Simulate document authenticity analysis
   */
  async analyzeDocumentAuthenticity(
    idCardFrontUrl: string,
    idCardBackUrl?: string,
    extractedData?: DocumentOcrResult
  ): Promise<DocumentAuthenticityResult> {
    await this.delay();

    logger.info('[MOCK] Analyzing document authenticity', {
      frontUrl: idCardFrontUrl,
      hasBack: !!idCardBackUrl,
    });

    // Check for test patterns in URL
    const isExpiredTest = idCardFrontUrl.includes('expired');
    const isTamperedTest = idCardFrontUrl.includes('tampered');

    const checks = {
      formatValid: !isTamperedTest && this.randomBool(0.9),
      securityFeaturesDetected: this.randomBool(0.85),
      noTamperingDetected: !isTamperedTest,
      expiryValid: !isExpiredTest,
    };

    const warnings: string[] = [];
    if (!checks.formatValid) warnings.push('Document format issues detected');
    if (!checks.securityFeaturesDetected)
      warnings.push('Some security features not detected');
    if (!checks.noTamperingDetected) warnings.push('Possible tampering detected');
    if (!checks.expiryValid) warnings.push('Document has expired');

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const confidence = (passedChecks / Object.keys(checks).length) * 100;

    return {
      success: true,
      isAuthentic: passedChecks >= 3,
      confidence,
      checks,
      warnings,
      rawResponse: { mock: true },
    };
  }

  // ==================== Helper Methods ====================

  private async delay(): Promise<void> {
    if (this.simulateDelay) {
      const ms =
        Math.random() * (this.maxDelay - this.minDelay) + this.minDelay;
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  private randomScore(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }

  private randomBool(probability: number): boolean {
    return Math.random() < probability;
  }

  private generateMockExtractedData(idCardType?: IdCardType): {
    fields: DocumentOcrResult['extractedFields'];
  } {
    const firstName = this.randomFromList([
      'KOUAME',
      'DIALLO',
      'TOURE',
      'KONE',
      'OUATTARA',
    ]);
    const lastName = this.randomFromList([
      'JEAN',
      'MARIE',
      'AMADOU',
      'FATOU',
      'IBRAHIMA',
    ]);

    const baseFields: DocumentOcrResult['extractedFields'] = {
      firstName: { value: firstName, confidence: this.randomScore(90, 99) },
      lastName: { value: lastName, confidence: this.randomScore(88, 99) },
      dateOfBirth: {
        value: '1985-06-15',
        confidence: this.randomScore(85, 98),
      },
      documentNumber: {
        value: `CI${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        confidence: this.randomScore(92, 99),
      },
      expiryDate: {
        value: '2028-12-31',
        confidence: this.randomScore(88, 97),
      },
      issueDate: { value: '2020-01-15', confidence: this.randomScore(85, 96) },
    };

    if (idCardType === 'PASSPORT') {
      baseFields.nationality = {
        value: 'IVOIRIEN',
        confidence: this.randomScore(90, 99),
      };
      baseFields.placeOfBirth = {
        value: 'ABIDJAN',
        confidence: this.randomScore(85, 95),
      };
    }

    return { fields: baseFields };
  }

  private randomFromList<T>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)];
  }
}

// Export singleton instance
export const mockVerificationService = new MockVerificationService();
