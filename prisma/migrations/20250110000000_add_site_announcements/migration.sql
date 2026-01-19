-- CreateEnum
CREATE TYPE "AnnouncementScope" AS ENUM ('MAIN', 'LIVE');
CREATE TYPE "AnnouncementBehavior" AS ENUM ('TIMED', 'PERSISTENT');

-- CreateTable
CREATE TABLE "SiteAnnouncement" (
    "id" TEXT NOT NULL,
    "scope" "AnnouncementScope" NOT NULL,
    "message" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'warning',
    "behavior" "AnnouncementBehavior" NOT NULL DEFAULT 'PERSISTENT',
    "durationMs" INTEGER,
    "dismissKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementDismissal" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "announcementId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteAnnouncement_scope_isActive_idx" ON "SiteAnnouncement"("scope", "isActive");

-- CreateIndex
CREATE INDEX "AnnouncementDismissal_userId_announcementId_idx" ON "AnnouncementDismissal"("userId", "announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementDismissal_announcementId_idx" ON "AnnouncementDismissal"("announcementId");

-- AddForeignKey
ALTER TABLE "AnnouncementDismissal" ADD CONSTRAINT "AnnouncementDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementDismissal" ADD CONSTRAINT "AnnouncementDismissal_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "SiteAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
