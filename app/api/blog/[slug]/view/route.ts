import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';

// POST /api/blog/[slug]/view
// Rate-limited per IP+slug so a single visitor can't farm the counter.
export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { slug } = params;
  if (!slug) return NextResponse.json({ error: 'Slug required' }, { status: 400 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const rl = await rateLimit(`blog-view:${ip}:${slug}`, 1, 30 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: true, counted: false });
  }

  try {
    const updated = await db.blogPost.update({
      where: { slug, published: true },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });
    return NextResponse.json({ ok: true, counted: true, viewCount: updated.viewCount });
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}
