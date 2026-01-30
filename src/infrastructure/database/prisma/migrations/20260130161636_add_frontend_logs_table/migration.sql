-- CreateEnum
CREATE TYPE "FrontendLogLevel" AS ENUM ('ERROR', 'WARN', 'INFO', 'DEBUG');

-- CreateTable
CREATE TABLE "frontend_logs" (
    "id" TEXT NOT NULL,
    "level" "FrontendLogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "page" VARCHAR(255),
    "action" VARCHAR(255),
    "userId" TEXT,
    "userAgent" TEXT,
    "stack" TEXT,
    "file" VARCHAR(500),
    "line" INTEGER,
    "sessionId" VARCHAR(255),
    "deviceId" VARCHAR(255),
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frontend_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "frontend_logs_level_idx" ON "frontend_logs"("level");

-- CreateIndex
CREATE INDEX "frontend_logs_timestamp_idx" ON "frontend_logs"("timestamp");

-- CreateIndex
CREATE INDEX "frontend_logs_userId_idx" ON "frontend_logs"("userId");

-- CreateIndex
CREATE INDEX "frontend_logs_sessionId_idx" ON "frontend_logs"("sessionId");

-- CreateIndex
CREATE INDEX "frontend_logs_level_timestamp_idx" ON "frontend_logs"("level", "timestamp");

-- CreateIndex
CREATE INDEX "frontend_logs_userId_timestamp_idx" ON "frontend_logs"("userId", "timestamp");

-- AddForeignKey
ALTER TABLE "frontend_logs" ADD CONSTRAINT "frontend_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
