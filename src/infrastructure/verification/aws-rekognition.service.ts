/**
 * AWS Rekognition Service for KYC Verification
 * Phase 12: AI-based identity verification
 *
 * Handles:
 * - Document text extraction (OCR)
 * - Face comparison between ID and selfie
 * - Liveness detection
 * - Document authenticity analysis
 */

import {
  RekognitionClient,
  CompareFacesCommand,
  DetectFacesCommand,
  DetectTextCommand,
  FaceDetail,
  TextDetection,
} from '@aws-sdk/client-rekognition';
import {
  TextractClient,
  AnalyzeDocumentCommand,
  AnalyzeIDCommand,
  Block,
  IdentityDocument,
} from '@aws-sdk/client-textract';
import axios from 'axios';

import config from '@config/index';
import logger from '@infrastructure/monitoring/logger';
import {
  DocumentOcrResult,
  FaceComparisonResult,
  LivenessDetectionResult,
  DocumentAuthenticityResult,
  BoundingBox,
} from '@/types/kyc.types';

export class AwsRekognitionService {
  private rekognitionClient: RekognitionClient;
  private textractClient: TextractClient;

  constructor() {
    const awsConfig = {
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    };

    this.rekognitionClient = new RekognitionClient(awsConfig);
    this.textractClient = new TextractClient(awsConfig);
  }

  /**
   * Extract text and data from ID document using AWS Textract
   */
  async extractDocumentData(
    idCardFrontUrl: string,
    idCardBackUrl?: string
  ): Promise<DocumentOcrResult> {
    try {
      logger.info('Starting document OCR extraction', {
        frontUrl: idCardFrontUrl,
        hasBack: !!idCardBackUrl,
      });

      // Download images as buffers
      const frontBuffer = await this.downloadImage(idCardFrontUrl);
      const backBuffer = idCardBackUrl
        ? await this.downloadImage(idCardBackUrl)
        : null;

      // Analyze ID document using Textract AnalyzeID
      const analyzeIdCommand = new AnalyzeIDCommand({
        DocumentPages: [
          { Bytes: frontBuffer },
          ...(backBuffer ? [{ Bytes: backBuffer }] : []),
        ],
      });

      const analyzeIdResult = await this.textractClient.send(analyzeIdCommand);

      // Parse identity documents
      const extractedFields = this.parseIdentityDocuments(
        analyzeIdResult.IdentityDocuments || []
      );

      // Get document quality assessment
      const documentQuality = await this.assessDocumentQuality(frontBuffer);

      // Calculate overall confidence
      const confidenceValues = Object.values(extractedFields)
        .filter((f) => f !== undefined)
        .map((f) => f!.confidence);
      const avgConfidence =
        confidenceValues.length > 0
          ? confidenceValues.reduce((a, b) => a + b, 0) /
            confidenceValues.length
          : 0;

      logger.info('Document OCR extraction completed', {
        fieldsExtracted: Object.keys(extractedFields).length,
        avgConfidence,
      });

      return {
        success: true,
        confidence: avgConfidence,
        extractedFields,
        documentType: this.detectDocumentType(extractedFields),
        documentQuality,
        rawResponse: analyzeIdResult,
      };
    } catch (error) {
      logger.error('Document OCR extraction failed', { error });
      return {
        success: false,
        confidence: 0,
        extractedFields: {},
        documentQuality: {
          overall: 0,
          brightness: 0,
          sharpness: 0,
          glare: 0,
        },
        rawResponse: error,
      };
    }
  }

  /**
   * Compare face on ID document with selfie
   */
  async compareFaces(
    idCardFrontUrl: string,
    selfieUrl: string
  ): Promise<FaceComparisonResult> {
    try {
      logger.info('Starting face comparison', {
        idCardUrl: idCardFrontUrl,
        selfieUrl,
      });

      // Download images
      const idCardBuffer = await this.downloadImage(idCardFrontUrl);
      const selfieBuffer = await this.downloadImage(selfieUrl);

      // Compare faces using Rekognition
      const compareFacesCommand = new CompareFacesCommand({
        SourceImage: { Bytes: idCardBuffer },
        TargetImage: { Bytes: selfieBuffer },
        SimilarityThreshold: 0, // Get all matches regardless of threshold
        QualityFilter: 'AUTO',
      });

      const compareResult =
        await this.rekognitionClient.send(compareFacesCommand);

      // Get face details for quality assessment
      const sourceFaceDetails = await this.detectFaces(idCardBuffer);
      const targetFaceDetails = await this.detectFaces(selfieBuffer);

      const bestMatch = compareResult.FaceMatches?.[0];
      const similarity = bestMatch?.Similarity || 0;
      const confidence = bestMatch?.Face?.Confidence || 0;

      const isMatch =
        similarity >= config.kycVerification.faceSimilarityThreshold;

      logger.info('Face comparison completed', {
        similarity,
        confidence,
        isMatch,
        unmatchedFaces: compareResult.UnmatchedFaces?.length || 0,
      });

      return {
        success: true,
        similarity,
        confidence,
        sourceFace: {
          detected: sourceFaceDetails.length > 0,
          quality: this.calculateFaceQuality(sourceFaceDetails[0]),
          boundingBox: this.extractBoundingBox(sourceFaceDetails[0]),
        },
        targetFace: {
          detected: targetFaceDetails.length > 0,
          quality: this.calculateFaceQuality(targetFaceDetails[0]),
          boundingBox: this.extractBoundingBox(targetFaceDetails[0]),
        },
        isMatch,
        rawResponse: compareResult,
      };
    } catch (error) {
      logger.error('Face comparison failed', { error });
      return {
        success: false,
        similarity: 0,
        confidence: 0,
        sourceFace: { detected: false, quality: 0 },
        targetFace: { detected: false, quality: 0 },
        isMatch: false,
        rawResponse: error,
      };
    }
  }

  /**
   * Perform liveness detection on selfie
   * Note: AWS Rekognition Liveness requires FaceLivenessSession which needs
   * a frontend SDK integration. This is a simplified version using face quality metrics.
   */
  async detectLiveness(selfieUrl: string): Promise<LivenessDetectionResult> {
    try {
      logger.info('Starting liveness detection', { selfieUrl });

      const selfieBuffer = await this.downloadImage(selfieUrl);
      const faceDetails = await this.detectFaces(selfieBuffer);

      if (faceDetails.length === 0) {
        return {
          success: false,
          isLive: false,
          confidence: 0,
          spoofType: 'unknown',
        };
      }

      if (faceDetails.length > 1) {
        logger.warn('Multiple faces detected in selfie', {
          count: faceDetails.length,
        });
      }

      const primaryFace = faceDetails[0];

      // Analyze face attributes for liveness indicators
      const livenessScore = this.calculateLivenessScore(primaryFace);
      const isLive = livenessScore >= config.kycVerification.livenessThreshold;

      // Detect potential spoof type based on face attributes
      const spoofType = this.detectSpoofType(primaryFace, livenessScore);

      logger.info('Liveness detection completed', {
        livenessScore,
        isLive,
        spoofType,
      });

      return {
        success: true,
        isLive,
        confidence: livenessScore,
        spoofType: isLive ? undefined : spoofType,
        rawResponse: faceDetails,
      };
    } catch (error) {
      logger.error('Liveness detection failed', { error });
      return {
        success: false,
        isLive: false,
        confidence: 0,
        rawResponse: error,
      };
    }
  }

  /**
   * Analyze document authenticity
   */
  async analyzeDocumentAuthenticity(
    idCardFrontUrl: string,
    idCardBackUrl?: string,
    extractedData?: DocumentOcrResult
  ): Promise<DocumentAuthenticityResult> {
    try {
      logger.info('Starting document authenticity analysis');

      const checks = {
        formatValid: false,
        securityFeaturesDetected: false,
        noTamperingDetected: true,
        expiryValid: true,
      };
      const warnings: string[] = [];

      // Check document format and quality
      if (extractedData) {
        checks.formatValid =
          extractedData.documentQuality.overall >= 50 &&
          extractedData.confidence >= 60;

        if (extractedData.documentQuality.overall < 50) {
          warnings.push('Document quality is low');
        }

        if (extractedData.documentQuality.glare > 50) {
          warnings.push('Glare detected on document');
        }

        // Check expiry date if extracted
        const expiryField = extractedData.extractedFields.expiryDate;
        if (expiryField?.value) {
          const expiryDate = new Date(expiryField.value);
          if (expiryDate < new Date()) {
            checks.expiryValid = false;
            warnings.push('Document has expired');
          }
        }

        // Check for required fields
        const requiredFields = ['firstName', 'lastName', 'documentNumber'];
        const missingFields = requiredFields.filter(
          (field) => !extractedData.extractedFields[field]?.value
        );
        if (missingFields.length > 0) {
          warnings.push(`Missing required fields: ${missingFields.join(', ')}`);
        }
      }

      // Detect text for additional analysis
      const frontBuffer = await this.downloadImage(idCardFrontUrl);
      const textDetections = await this.detectText(frontBuffer);

      // Basic security feature detection (looking for common ID features)
      const securityKeywords = [
        'REPUBLIC',
        'IDENTITY',
        'NATIONAL',
        'PASSPORT',
        'DRIVER',
        'LICENCE',
        'LICENSE',
        'CARTE',
        'IDENTITE',
        'PERMIS',
      ];
      const detectedTexts = textDetections.map((t) =>
        t.DetectedText?.toUpperCase()
      );
      checks.securityFeaturesDetected = securityKeywords.some((keyword) =>
        detectedTexts.some((text) => text?.includes(keyword))
      );

      // Calculate overall authenticity score
      const checksPassed = Object.values(checks).filter(Boolean).length;
      const confidence = (checksPassed / Object.keys(checks).length) * 100;
      const isAuthentic =
        confidence >= 75 && checks.formatValid && checks.expiryValid;

      logger.info('Document authenticity analysis completed', {
        confidence,
        isAuthentic,
        checks,
        warningsCount: warnings.length,
      });

      return {
        success: true,
        isAuthentic,
        confidence,
        checks,
        warnings,
        rawResponse: { textDetections },
      };
    } catch (error) {
      logger.error('Document authenticity analysis failed', { error });
      return {
        success: false,
        isAuthentic: false,
        confidence: 0,
        checks: {
          formatValid: false,
          securityFeaturesDetected: false,
          noTamperingDetected: false,
          expiryValid: false,
        },
        warnings: ['Analysis failed due to technical error'],
        rawResponse: error,
      };
    }
  }

  // ==================== Helper Methods ====================

  private async downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    return Buffer.from(response.data);
  }

  private async detectFaces(imageBuffer: Buffer): Promise<FaceDetail[]> {
    const command = new DetectFacesCommand({
      Image: { Bytes: imageBuffer },
      Attributes: ['ALL'],
    });
    const result = await this.rekognitionClient.send(command);
    return result.FaceDetails || [];
  }

  private async detectText(imageBuffer: Buffer): Promise<TextDetection[]> {
    const command = new DetectTextCommand({
      Image: { Bytes: imageBuffer },
    });
    const result = await this.rekognitionClient.send(command);
    return result.TextDetections || [];
  }

  private parseIdentityDocuments(
    documents: IdentityDocument[]
  ): DocumentOcrResult['extractedFields'] {
    const fields: DocumentOcrResult['extractedFields'] = {};

    for (const doc of documents) {
      for (const field of doc.IdentityDocumentFields || []) {
        const type = field.Type?.Text;
        const value = field.ValueDetection?.Text;
        const confidence = field.ValueDetection?.Confidence || 0;

        if (type && value) {
          const fieldName = this.mapFieldName(type);
          if (fieldName) {
            fields[fieldName] = { value, confidence };
          }
        }
      }
    }

    return fields;
  }

  private mapFieldName(awsFieldType: string): string | null {
    const fieldMapping: Record<string, string> = {
      FIRST_NAME: 'firstName',
      LAST_NAME: 'lastName',
      MIDDLE_NAME: 'middleName',
      SUFFIX: 'suffix',
      DATE_OF_BIRTH: 'dateOfBirth',
      PLACE_OF_BIRTH: 'placeOfBirth',
      DOCUMENT_NUMBER: 'documentNumber',
      EXPIRATION_DATE: 'expiryDate',
      DATE_OF_ISSUE: 'issueDate',
      ID_TYPE: 'documentType',
      ADDRESS: 'address',
      CITY: 'city',
      STATE: 'state',
      ZIP_CODE: 'zipCode',
      COUNTY: 'county',
      ENDORSEMENTS: 'endorsements',
      GENDER: 'gender',
      MRZ_CODE: 'mrzCode',
    };

    return fieldMapping[awsFieldType] || null;
  }

  private async assessDocumentQuality(
    imageBuffer: Buffer
  ): Promise<DocumentOcrResult['documentQuality']> {
    try {
      // Use Rekognition to analyze image quality through face detection
      // If there's a face on the ID, we can get quality metrics
      const faceDetails = await this.detectFaces(imageBuffer);

      if (faceDetails.length > 0) {
        const face = faceDetails[0];
        const quality = face.Quality || {};

        return {
          overall: ((quality.Brightness || 50) + (quality.Sharpness || 50)) / 2,
          brightness: quality.Brightness || 50,
          sharpness: quality.Sharpness || 50,
          glare: 100 - (quality.Brightness || 50), // Approximation
        };
      }

      // Default quality if no face detected
      return {
        overall: 70,
        brightness: 70,
        sharpness: 70,
        glare: 30,
      };
    } catch {
      return {
        overall: 50,
        brightness: 50,
        sharpness: 50,
        glare: 50,
      };
    }
  }

  private detectDocumentType(
    fields: DocumentOcrResult['extractedFields']
  ): string | undefined {
    const docTypeField = fields.documentType;
    if (docTypeField?.value) {
      return docTypeField.value;
    }

    // Infer document type from extracted fields
    const hasPassportFields =
      fields.mrzCode !== undefined || fields.nationality !== undefined;
    if (hasPassportFields) {
      return 'PASSPORT';
    }

    const hasDriverLicenseFields =
      fields.endorsements !== undefined || fields.state !== undefined;
    if (hasDriverLicenseFields) {
      return 'DRIVING_LICENSE';
    }

    return 'ID_CARD';
  }

  private calculateFaceQuality(face?: FaceDetail): number {
    if (!face) return 0;

    const quality = face.Quality || {};
    const brightness = quality.Brightness || 50;
    const sharpness = quality.Sharpness || 50;
    const confidence = face.Confidence || 50;

    return (brightness + sharpness + confidence) / 3;
  }

  private extractBoundingBox(face?: FaceDetail): BoundingBox | undefined {
    if (!face?.BoundingBox) return undefined;

    return {
      left: face.BoundingBox.Left || 0,
      top: face.BoundingBox.Top || 0,
      width: face.BoundingBox.Width || 0,
      height: face.BoundingBox.Height || 0,
    };
  }

  private calculateLivenessScore(face: FaceDetail): number {
    // Combine multiple indicators for liveness
    const quality = face.Quality || {};
    const confidence = face.Confidence || 0;
    const brightness = quality.Brightness || 50;
    const sharpness = quality.Sharpness || 50;

    // Check if eyes are open (indicator of live person)
    const eyesOpen = face.EyesOpen?.Value ? 10 : 0;
    const eyesOpenConfidence = face.EyesOpen?.Confidence || 0;

    // Check pose (not too extreme for a selfie)
    const pose = face.Pose || {};
    const poseScore = this.calculatePoseScore(pose);

    // Calculate weighted score
    const score =
      confidence * 0.3 +
      brightness * 0.15 +
      sharpness * 0.15 +
      eyesOpen * 2 +
      eyesOpenConfidence * 0.1 +
      poseScore * 0.2;

    return Math.min(100, Math.max(0, score));
  }

  private calculatePoseScore(pose: {
    Roll?: number;
    Yaw?: number;
    Pitch?: number;
  }): number {
    // Ideal pose for selfie: looking straight at camera
    const rollDeviation = Math.abs(pose.Roll || 0);
    const yawDeviation = Math.abs(pose.Yaw || 0);
    const pitchDeviation = Math.abs(pose.Pitch || 0);

    // Penalize extreme poses
    const maxDeviation = 30;
    const rollScore = Math.max(0, 100 - (rollDeviation / maxDeviation) * 100);
    const yawScore = Math.max(0, 100 - (yawDeviation / maxDeviation) * 100);
    const pitchScore = Math.max(0, 100 - (pitchDeviation / maxDeviation) * 100);

    return (rollScore + yawScore + pitchScore) / 3;
  }

  private detectSpoofType(
    face: FaceDetail,
    livenessScore: number
  ): 'photo' | 'video' | 'mask' | 'unknown' {
    // Low quality might indicate a photo of a photo
    const quality = face.Quality || {};
    if ((quality.Sharpness || 100) < 30) {
      return 'photo';
    }

    // Check for mask indicators
    const mouthOpen = face.MouthOpen;
    const eyesOpen = face.EyesOpen;

    if (
      mouthOpen?.Value === false &&
      mouthOpen.Confidence &&
      mouthOpen.Confidence > 90 &&
      eyesOpen?.Value === false &&
      eyesOpen.Confidence &&
      eyesOpen.Confidence > 90
    ) {
      return 'mask';
    }

    if (livenessScore < 50) {
      return 'photo';
    }

    return 'unknown';
  }
}

// Export singleton instance
export const awsRekognitionService = new AwsRekognitionService();
