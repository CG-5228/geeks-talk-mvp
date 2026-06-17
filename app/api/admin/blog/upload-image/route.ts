import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { uploadToS3 } from '@/lib/s3';
import { sniffImageType } from '@/lib/uploads';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

// POST /api/admin/blog/upload-image — uploads a blog cover or inline image to
// S3 under the `blog/` prefix. Returns a stable proxy URL that re-signs on
// each hit, so stored references don't expire after 7 days.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 8 MB limit' }, { status: 413 });
    }
    if (file.type === 'image/svg+xml') {
      return NextResponse.json({ error: 'SVG images are not allowed' }, { status: 415 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate by magic bytes — never trust client mime/extension.
    // AVIF has no signature in the shared sniffer, so check its ISOBMFF
    // `ftyp` box brand ("avif"/"avis") inline.
    const sniffed = sniffImageType(buffer);
    const isAvif =
      buffer.length >= 12 &&
      buffer.slice(4, 8).toString('ascii') === 'ftyp' &&
      ['avif', 'avis'].includes(buffer.slice(8, 12).toString('ascii'));
    const isValidImage =
      sniffed === 'image/png' ||
      sniffed === 'image/jpeg' ||
      sniffed === 'image/gif' ||
      sniffed === 'image/webp' ||
      isAvif;
    if (!isValidImage) {
      return NextResponse.json({ error: 'File content does not match a valid image' }, { status: 415 });
    }
    const contentType = isAvif ? 'image/avif' : sniffed!;

    const uploaded = await uploadToS3(buffer, file.name || 'image', 'blog', contentType);

    const proxyUrl = `/api/blog/image?key=${encodeURIComponent(uploaded.key)}`;

    return NextResponse.json({
      key: uploaded.key,
      url: proxyUrl,
    });
  } catch (error) {
    console.error('Failed to upload blog image:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
