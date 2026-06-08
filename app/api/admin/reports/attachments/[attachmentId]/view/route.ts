import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { getPresignedUrl } from '@/lib/s3';

// Re-signs a fresh presigned URL for a report attachment on demand. Stored
// s3Url values expire after 7 days; this endpoint keeps the admin UI working
// indefinitely without broadening S3 permissions.
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ attachmentId: string }> }
) {
  const { attachmentId } = await props.params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const attachment = await db.userReportAttachment.findUnique({
    where: { id: attachmentId },
    select: { s3Key: true, fileName: true, fileType: true },
  });

  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  }

  // Only render a narrow allowlist of safe types inline. A stored fileType of
  // text/html or image/svg+xml served inline would execute attacker-controlled
  // markup in the admin's browser (stored XSS); force everything else to
  // download as an opaque octet-stream instead.
  const SAFE_INLINE = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/pdf',
  ]);
  const fileType = (attachment.fileType || '').toLowerCase();
  const inlineOk = SAFE_INLINE.has(fileType);

  const url = await getPresignedUrl(attachment.s3Key, 60 * 60, {
    inline: inlineOk,
    contentType: inlineOk ? attachment.fileType : 'application/octet-stream',
    fileName: attachment.fileName,
  });

  return NextResponse.redirect(url);
}
