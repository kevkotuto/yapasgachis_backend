-- Make store_staff.userId nullable so we can persist invitations for people
-- who don't have a YaPasGachis account yet. The link is materialized at signup
-- (auth.service) or when the invitee opens the invite token endpoint.

-- 1) Drop the FK + unique constraint so we can mutate the column.
ALTER TABLE "store_staff" DROP CONSTRAINT IF EXISTS "store_staff_userId_fkey";
ALTER TABLE "store_staff" DROP CONSTRAINT IF EXISTS "store_staff_storeId_userId_key";

-- 2) Allow NULL userId.
ALTER TABLE "store_staff" ALTER COLUMN "userId" DROP NOT NULL;

-- 3) Add metadata columns for pending invitees (no user row yet).
ALTER TABLE "store_staff" ADD COLUMN IF NOT EXISTS "invitePhoneNumber" TEXT;
ALTER TABLE "store_staff" ADD COLUMN IF NOT EXISTS "inviteEmail" TEXT;
ALTER TABLE "store_staff" ADD COLUMN IF NOT EXISTS "inviteFirstName" TEXT;
ALTER TABLE "store_staff" ADD COLUMN IF NOT EXISTS "inviteLastName" TEXT;

-- 4) Re-add FK as nullable, keep cascade on delete.
ALTER TABLE "store_staff"
  ADD CONSTRAINT "store_staff_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Partial unique index: enforce uniqueness only when a userId is present.
--    Lets multiple pending invites coexist (NULL userId).
CREATE UNIQUE INDEX IF NOT EXISTS "store_staff_storeId_userId_key"
  ON "store_staff" ("storeId", "userId")
  WHERE "userId" IS NOT NULL;

-- 6) Indices on the new lookup columns (auto-link at signup uses these).
CREATE INDEX IF NOT EXISTS "store_staff_invitePhoneNumber_idx"
  ON "store_staff" ("invitePhoneNumber");
CREATE INDEX IF NOT EXISTS "store_staff_inviteEmail_idx"
  ON "store_staff" ("inviteEmail");
