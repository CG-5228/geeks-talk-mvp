-- AlterTable
ALTER TABLE "AdminPermission" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'moderator';

-- CreateIndex
CREATE INDEX "AdminPermission_role_idx" ON "AdminPermission"("role");
