/**
 * KYC AI Verification Types
 * Phase 12: AI-based identity verification system
 *
 * Note: Ces enums seront migrés vers Prisma quand la Phase 12 sera implémentée
 */

// Types temporaires - seront remplacés par Prisma enums en Phase 12
export enum IdCardType {
  CNI = 'CNI',
  PASSPORT = 'PASSPORT',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  RESIDENCE_PERMIT = 'RESIDENCE_PERMIT',
}

export enum KycCheckType {
  DOCUMENT_OCR = 'DOCUMENT_OCR',
  DOCUMENT_AUTHENTICITY = 'DOCUMENT_AUTHENTICITY',
  FACE_COMPARISON = 'FACE_COMPARISON',
  LIVENESS_DETECTION = 'LIVENESS_DETECTION',
}

export enum KycVerificationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  AI_APPROVED = 'AI_APPROVED',
  AI_REJECTED = 'AI_REJECTED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  MANUALLY_APPROVED = 'MANUALLY_APPROVED',
  MANUALLY_REJECTED = 'MANUALLY_REJECTED',
  FAILED = 'FAILED',
}

// ==================== ENUMS ====================

export enum KycNotificationType {
  KYC_SUBMITTED = 'KYC_SUBMITTED',
  KYC_PROCESSING = 'KYC_PROCESSING',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  KYC_MANUAL_REVIEW = 'KYC_MANUAL_REVIEW',
  KYC_RESUBMIT_REQUIRED = 'KYC_RESUBMIT_REQUIRED',
}

export enum KycErrorCode {
  // Document errors
  DOCUMENT_UNREADABLE = 'DOCUMENT_UNREADABLE',
  DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED',
  DOCUMENT_INVALID_FORMAT = 'DOCUMENT_INVALID_FORMAT',
  DOCUMENT_TAMPERED = 'DOCUMENT_TAMPERED',
  DOCUMENT_WRONG_TYPE = 'DOCUMENT_WRONG_TYPE',
  DOCUMENT_BLURRY = 'DOCUMENT_BLURRY',
  DOCUMENT_INCOMPLETE = 'DOCUMENT_INCOMPLETE',

  // Face verification errors
  FACE_NOT_DETECTED = 'FACE_NOT_DETECTED',
  FACE_MULTIPLE_DETECTED = 'FACE_MULTIPLE_DETECTED',
  FACE_MISMATCH = 'FACE_MISMATCH',
  FACE_LOW_QUALITY = 'FACE_LOW_QUALITY',
  FACE_OBSCURED = 'FACE_OBSCURED',

  // Liveness errors
  LIVENESS_FAILED = 'LIVENESS_FAILED',
  LIVENESS_SPOOF_DETECTED = 'LIVENESS_SPOOF_DETECTED',

  // Technical errors
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Business errors
  MAX_ATTEMPTS_EXCEEDED = 'MAX_ATTEMPTS_EXCEEDED',
  SUPPLIER_NOT_FOUND = 'SUPPLIER_NOT_FOUND',
  KYC_ALREADY_VERIFIED = 'KYC_ALREADY_VERIFIED',
  KYC_ALREADY_PENDING = 'KYC_ALREADY_PENDING',
}

// ==================== DTOs ====================

export interface KycSubmitDocumentsDto {
  idCardType: IdCardType;
  idCardNumber?: string;
  idCardExpiry?: Date;
}

export interface KycSubmitResult {
  attemptId: string;
  status: KycVerificationStatus;
  message: string;
  estimatedProcessingTime?: number; // in seconds
}

export interface KycVerificationResult {
  attemptId: string;
  status: KycVerificationStatus;
  overallScore: number | null;
  documentScore: number | null;
  faceMatchScore: number | null;
  livenessScore: number | null;
  checks: KycCheckResult[];
  extractedData?: KycExtractedDataResult;
  errorCode?: KycErrorCode;
  errorMessage?: string;
  processingDurationMs?: number;
  reviewRequired: boolean;
}

export interface KycCheckResult {
  checkType: KycCheckType;
  passed: boolean | null;
  score: number | null;
  confidence: number | null;
  failureReason?: string;
  durationMs?: number;
}

export interface KycExtractedDataResult {
  documentNumber?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  placeOfBirth?: string;
  gender?: string;
  nationality?: string;
  issueDate?: Date;
  expiryDate?: Date;
  issuingAuthority?: string;
  issuingCountry?: string;
  address?: string;
  extractionConfidence?: number;
  isExpired?: boolean;
  isValid?: boolean;
}

export interface KycStatusResponse {
  supplierId: string;
  kycStatus: string;
  latestAttempt?: {
    attemptId: string;
    status: KycVerificationStatus;
    overallScore?: number;
    submittedAt: Date;
    processedAt?: Date;
    errorMessage?: string;
  };
  attemptsCount: number;
  maxAttempts: number;
  canResubmit: boolean;
  extractedData?: KycExtractedDataResult;
}

// ==================== AI Provider Interfaces ====================

export interface DocumentOcrResult {
  success: boolean;
  confidence: number;
  extractedFields: {
    documentNumber?: { value: string; confidence: number };
    firstName?: { value: string; confidence: number };
    lastName?: { value: string; confidence: number };
    dateOfBirth?: { value: string; confidence: number };
    expiryDate?: { value: string; confidence: number };
    issueDate?: { value: string; confidence: number };
    nationality?: { value: string; confidence: number };
    gender?: { value: string; confidence: number };
    address?: { value: string; confidence: number };
    [key: string]: { value: string; confidence: number } | undefined;
  };
  documentType?: string;
  documentQuality: {
    overall: number;
    brightness: number;
    sharpness: number;
    glare: number;
  };
  rawResponse?: unknown;
}

export interface FaceComparisonResult {
  success: boolean;
  similarity: number; // 0-100
  confidence: number; // 0-100
  sourceFace: {
    detected: boolean;
    quality: number;
    boundingBox?: BoundingBox;
  };
  targetFace: {
    detected: boolean;
    quality: number;
    boundingBox?: BoundingBox;
  };
  isMatch: boolean;
  rawResponse?: unknown;
}

export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface LivenessDetectionResult {
  success: boolean;
  isLive: boolean;
  confidence: number; // 0-100
  spoofType?: 'photo' | 'video' | 'mask' | 'unknown';
  auditImages?: string[];
  rawResponse?: unknown;
}

export interface DocumentAuthenticityResult {
  success: boolean;
  isAuthentic: boolean;
  confidence: number; // 0-100
  checks: {
    formatValid: boolean;
    securityFeaturesDetected: boolean;
    noTamperingDetected: boolean;
    expiryValid: boolean;
  };
  warnings: string[];
  rawResponse?: unknown;
}

// ==================== Queue Job Types ====================

export interface KycVerificationJobData {
  attemptId: string;
  supplierId: string;
  idCardFrontUrl: string;
  idCardBackUrl?: string;
  selfieUrl: string;
  idCardType: IdCardType;
  provider: 'aws-rekognition' | 'azure' | 'google' | 'mock';
}

export interface KycCheckJobData {
  attemptId: string;
  checkType: KycCheckType;
  imageUrls: {
    idCardFront: string;
    idCardBack?: string;
    selfie: string;
  };
}

export interface KycNotificationJobData {
  supplierId: string;
  attemptId: string;
  notificationType: KycNotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// ==================== Admin Types ====================

export interface KycAdminReviewDto {
  approve: boolean;
  notes?: string;
}

export interface KycPendingReviewItem {
  attemptId: string;
  supplierId: string;
  supplierName: string;
  supplierEmail?: string;
  supplierPhone?: string;
  idCardType: IdCardType;
  status: KycVerificationStatus;
  overallScore?: number;
  documentScore?: number;
  faceMatchScore?: number;
  livenessScore?: number;
  submittedAt: Date;
  idCardFrontUrl: string;
  idCardBackUrl?: string;
  selfieUrl: string;
  extractedData?: KycExtractedDataResult;
  errorMessage?: string;
}

export interface KycAdminStats {
  totalAttempts: number;
  pendingReview: number;
  aiApproved: number;
  aiRejected: number;
  manuallyApproved: number;
  manuallyRejected: number;
  failed: number;
  averageProcessingTimeMs: number;
  averageScore: number;
  byProvider: {
    provider: string;
    count: number;
    avgScore: number;
  }[];
  todayStats: {
    submitted: number;
    approved: number;
    rejected: number;
    pendingReview: number;
  };
}

export interface KycAttemptDetails extends KycPendingReviewItem {
  checks: KycCheckResult[];
  ocrResults?: DocumentOcrResult;
  documentAnalysis?: DocumentAuthenticityResult;
  faceAnalysis?: FaceComparisonResult;
  livenessAnalysis?: LivenessDetectionResult;
  reviewHistory: {
    reviewedByAdminId?: string;
    reviewedAt?: Date;
    reviewNotes?: string;
  };
  processingDurationMs?: number;
}

// ==================== Webhook Types ====================

export interface KycWebhookPayload {
  event: 'kyc.completed' | 'kyc.manual_review_required' | 'kyc.failed';
  timestamp: string;
  attemptId: string;
  supplierId: string;
  status: KycVerificationStatus;
  result?: {
    overallScore?: number;
    passed: boolean;
    errorCode?: KycErrorCode;
  };
}

// ==================== Filter Types ====================

export interface KycAttemptsFilter {
  supplierId?: string;
  status?: KycVerificationStatus | KycVerificationStatus[];
  provider?: string;
  fromDate?: Date;
  toDate?: Date;
  minScore?: number;
  maxScore?: number;
  idCardType?: IdCardType;
}

export interface KycAttemptsListOptions extends KycAttemptsFilter {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'overallScore' | 'processingDurationMs';
  sortOrder?: 'asc' | 'desc';
}
