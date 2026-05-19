-- Make StoreStaff.userId nullable so we can persist invitations for people
-- who don't have a YaPasGachis account yet. The link is materialized at signup
-- (auth.service) or when the invitee opens the invite token endpoint.

-- 1) Drop the existing FK + unique constraint so we can mutate the column.
ALTER TABLE "StoreStaff" DROP CONSTRAINT IF EXISTS "StoreStaff_userId_fkey";
ALTER TABLE "StoreStaff" DROP CONSTRAINT IF EXISTS "StoreStaff_storeId_userId_key";

-- 2) Allow NULL userId.
ALTER TABLE "StoreStaff" ALTER COLUMN "userId" DROP NOT NULL;

-- 3) Add metadata columns for pending invitees (no user row yet).
ALTER TABLE "StoreStaff" ADD COLUMN IF NOT EXISTS "invitePhoneNumber" TEXT;
ALTER TABLE "StoreStaff" ADD COLUMN IF NOT EXISTS "inviteEmail" TEXT;
ALTER TABLE "StoreStaff" ADD COLUMN IF NOT EXISTS "inviteFirstName" TEXT;
ALTER TABLE "StoreStaff" ADD COLUMN IF NOT EXISTS "inviteLastName" TEXT;

-- 4) Re-add FK as nullable, keep cascade on delete.
ALTER TABLE "StoreStaff"
  ADD CONSTRAINT "StoreStaff_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Re-add the unique constraint but only enforce it when a userId is present.
--    A partial unique index lets multiple pending invites coexist on the same store.
CREATE UNIQUE INDEX IF NOT EXISTS "StoreStaff_storeId_userId_key"
  ON "StoreStaff" ("storeId", "userId")
  WHERE "userId" IS NOT NULL;

-- 6) Indices on the new lookup columns (auto-link at signup uses these).
CREATE INDEX IF NOT EXISTS "StoreStaff_invitePhoneNumber_idx"
  ON "StoreStaff" ("invitePhoneNumber");
CREATE INDEX IF NOT EXISTS "StoreStaff_inviteEmail_idx"
  ON "StoreStaff" ("inviteEmail");
