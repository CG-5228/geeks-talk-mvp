-- Relaxes UserReportAttachment.s3Url to nullable so the upload pipeline can
-- stop persisting short-lived presigned URLs. The admin UI now re-signs a
-- fresh URL on demand via /api/admin/reports/attachments/[id]/view, making
-- the stored URL dead data. Column retained for backward compatibility with
-- existing rows; a later migration can drop it entirely once historical rows
-- are migrated or expired.
ALTER TABLE "UserReportAttachment" ALTER COLUMN "s3Url" DROP NOT NULL;
