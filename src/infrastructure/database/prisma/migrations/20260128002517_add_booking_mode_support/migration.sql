-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('SINGLE_DATE', 'DATE_RANGE');

-- AlterTable
ALTER TABLE "deals" ADD COLUMN "bookingMode" "BookingMode" NOT NULL DEFAULT 'SINGLE_DATE';

-- AlterTable
ALTER TABLE "deal_bookings" ADD COLUMN "bookingEndDate" TIMESTAMP(3),
ADD COLUMN "numberOfNights" INTEGER;

-- CreateIndex
CREATE INDEX "deal_bookings_dealId_bookingDate_bookingEndDate_idx" ON "deal_bookings"("dealId", "bookingDate", "bookingEndDate");
