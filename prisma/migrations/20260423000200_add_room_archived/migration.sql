-- Adds an `archived` flag to Room so admins can soft-hide channels without deleting them.
ALTER TABLE "Room" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Room_archived_idx" ON "Room"("archived");
