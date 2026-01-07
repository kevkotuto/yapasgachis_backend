-- Phase 12: AI-based KYC Verification
-- Migration to add KYC verification tables and enums

-- Create KYC Verification Status Enum
CREATE TYPE "KycVerificationStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'AI_APPROVED',
  'AI_REJECTED',
  'MANUAL_REVIEW',
  'MANUALLY_APPROVED',
  'MANUALLY_REJECTED',
  'FAILED'
);

-- Create ID Card Type Enum
CREATE TYPE "IdCardType" AS ENUM (
  'CNI',
  'PASSPORT',
  'DRIVING_LICENSE',
  'RESIDENCE_CARD'
);

-- Create KYC Check Type Enum
CREATE TYPE "KycCheckType" AS ENUM (
  'DOCUMENT_OCR',
  'DOCUMENT_VALIDITY',
  'DOCUMENT_AUTHENTICITY',
  'FACE_MATCH',
  'LIVENESS_DETECTION'
);

-- Create KYC Verification Attempt Table
CREATE TABLE "kyc_verification_attempts" (
  "id" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "status" "KycVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "id_card_type" "IdCardType" NOT NULL,
  "id_card_front_url" TEXT NOT NULL,
  "id_card_back_url" TEXT,
  "selfie_url" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'aws-rekognition',
  "overall_score" DOUBLE PRECISION,
  "document_score" DOUBLE PRECISION,
  "face_match_score" DOUBLE PRECISION,
  "liveness_score" DOUBLE PRECISION,
  "ocr_results" JSONB,
  "document_analysis" JSONB,
  "face_analysis" JSONB,
  "liveness_analysis" JSONB,
  "error_code" TEXT,
  "error_message" TEXT,
  "processing_started_at" TIMESTAMP(3),
  "processing_completed_at" TIMESTAMP(3),
  "processing_duration_ms" INTEGER,
  "reviewed_by_admin_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "review_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "kyc_verification_attempts_pkey" PRIMARY KEY ("id")
);

-- Create KYC Verification Checks Table
CREATE TABLE "kyc_verification_checks" (
  "id" TEXT NOT NULL,
  "attempt_id" TEXT NOT NULL,
  "check_type" "KycCheckType" NOT NULL,
  "passed" BOOLEAN,
  "score" DOUBLE PRECISION,
  "confidence" DOUBLE PRECISION,
  "failure_reason" TEXT,
  "raw_result" JSONB,
  "duration_ms" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "kyc_verification_checks_pkey" PRIMARY KEY ("id")
);

-- Create KYC Extracted Data Table
CREATE TABLE "kyc_extracted_data" (
  "id" TEXT NOT NULL,
  "attempt_id" TEXT NOT NULL,
  "document_number" TEXT,
  "first_name" TEXT,
  "last_name" TEXT,
  "date_of_birth" TIMESTAMP(3),
  "place_of_birth" TEXT,
  "gender" TEXT,
  "nationality" TEXT,
  "issue_date" TIMESTAMP(3),
  "expiry_date" TIMESTAMP(3),
  "issuing_authority" TEXT,
  "issuing_country" TEXT,
  "address" TEXT,
  "mrz_line1" TEXT,
  "mrz_line2" TEXT,
  "mrz_line3" TEXT,
  "extraction_confidence" DOUBLE PRECISION,
  "is_expired" BOOLEAN,
  "is_valid" BOOLEAN,
  "raw_data" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "kyc_extracted_data_pkey" PRIMARY KEY ("id")
);

-- Create KYC Notifications Table
CREATE TABLE "kyc_notifications" (
  "id" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "attempt_id" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "data" JSONB,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "kyc_notifications_pkey" PRIMARY KEY ("id")
);

-- Create Indexes for KYC Verification Attempts
CREATE INDEX "kyc_verification_attempts_supplier_id_idx" ON "kyc_verification_attempts"("supplier_id");
CREATE INDEX "kyc_verification_attempts_status_idx" ON "kyc_verification_attempts"("status");
CREATE INDEX "kyc_verification_attempts_created_at_idx" ON "kyc_verification_attempts"("created_at" DESC);
CREATE INDEX "kyc_verification_attempts_provider_idx" ON "kyc_verification_attempts"("provider");

-- Create Indexes for KYC Verification Checks
CREATE INDEX "kyc_verification_checks_attempt_id_idx" ON "kyc_verification_checks"("attempt_id");
CREATE INDEX "kyc_verification_checks_check_type_idx" ON "kyc_verification_checks"("check_type");

-- Create Unique Index for KYC Extracted Data (one per attempt)
CREATE UNIQUE INDEX "kyc_extracted_data_attempt_id_key" ON "kyc_extracted_data"("attempt_id");

-- Create Indexes for KYC Notifications
CREATE INDEX "kyc_notifications_supplier_id_idx" ON "kyc_notifications"("supplier_id");
CREATE INDEX "kyc_notifications_read_idx" ON "kyc_notifications"("read");
CREATE INDEX "kyc_notifications_created_at_idx" ON "kyc_notifications"("created_at" DESC);

-- Add Foreign Key Constraints
ALTER TABLE "kyc_verification_attempts" ADD CONSTRAINT "kyc_verification_attempts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kyc_verification_attempts" ADD CONSTRAINT "kyc_verification_attempts_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kyc_verification_checks" ADD CONSTRAINT "kyc_verification_checks_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "kyc_verification_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kyc_extracted_data" ADD CONSTRAINT "kyc_extracted_data_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "kyc_verification_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "kyc_notifications" ADD CONSTRAINT "kyc_notifications_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kyc_notifications" ADD CONSTRAINT "kyc_notifications_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "kyc_verification_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
