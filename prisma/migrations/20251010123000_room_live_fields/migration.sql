-- Safe forward migration to align Room with current schema
-- Adds ownerId, slug, visibility, category, inviteCode; drops legacy createdById; indexes + FK

-- Add columns if missing
ALTER TABLE "Room"
  ADD COLUMN IF NOT EXISTS "category"   TEXT NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS "inviteCode" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerId"    TEXT,
  ADD COLUMN IF NOT EXISTS "slug"       TEXT,
  ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'public';

-- Backfill slug for existing rows where null
UPDATE "Room"
SET "slug" = COALESCE(
    LOWER(REGEXP_REPLACE("name", '\\s+', '-', 'g')) || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6),
    SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12)
)
WHERE "slug" IS NULL;

-- Ensure slug is not null going forward
ALTER TABLE "Room" ALTER COLUMN "slug" SET NOT NULL;

-- Drop legacy owner column and FK if present
ALTER TABLE "Room" DROP CONSTRAINT IF EXISTS "Room_createdById_fkey";
ALTER TABLE "Room" DROP COLUMN IF EXISTS "createdById";

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Room_slug_key" ON "Room"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Room_inviteCode_key" ON "Room"("inviteCode");

-- Add FK for ownerId if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Room_ownerId_fkey'
  ) THEN
    ALTER TABLE "Room"
      ADD CONSTRAINT "Room_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;