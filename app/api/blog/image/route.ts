import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/s3';

// GET /api/blog/image?key=<s3-key> — public proxy that re-signs the presigned
// URL on each hit and redirects to S3. Lets us store a stable URL in
// BlogPost.coverImage and inline content without worrying about 7-day expiry.
// Only keys inside the `blog/` prefix are allowed, to prevent using this
// endpoint to enumerate other buckets folders (e.g. private report uploads).
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key || !key.startsWith('blog/')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  try {
    const url = await getPresignedUrl(key, 60 * 60, { inline: true });
    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    console.error('Failed to resolve blog image:', error);
    return NextResponse.json({ error: 'Image not available' }, { status: 502 });
  }
}
