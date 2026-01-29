-- Migration: Add UserPaymentMethod table
-- Date: 2026-01-26
-- Description: Add user payment methods table for storing Wave, Orange Money, etc.

-- Create user_payment_methods table
CREATE TABLE IF NOT EXISTS "user_payment_methods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_payment_methods_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "user_payment_methods_userId_idx" ON "user_payment_methods"("userId");
CREATE INDEX IF NOT EXISTS "user_payment_methods_provider_idx" ON "user_payment_methods"("provider");
CREATE INDEX IF NOT EXISTS "user_payment_methods_isDefault_idx" ON "user_payment_methods"("isDefault");

-- Add foreign key constraint
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Info message
SELECT 'Migration completed: user_payment_methods table created successfully' as message;
