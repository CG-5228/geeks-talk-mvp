import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';

const ALLOWED = new Set(['like', 'love', 'insightful', 'celebrate']);

async function loadCounts(postId: string, userId: string | null) {
  const [grouped, mine] = await Promise.all([
    db.blogReaction.groupBy({
      by: ['type'],
      where: { postId },
      _count: { type: true },
    }),
    userId
      ? db.blogReaction.findMany({ where: { postId, userId }, select: { type: true } })
      : Promise.resolve([]),
  ]);

  const counts = grouped.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = row._count.type;
    return acc;
  }, {});
  return { counts, mine: mine.map((r) => r.type) };
}

// GET /api/blog/[slug]/reactions — counts + caller's picks
export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const post = await db.blogPost.findUnique({
    where: { slug: params.slug, published: true },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  return NextResponse.json(await loadCounts(post.id, userId));
}

// POST /api/blog/[slug]/reactions — toggle a reaction for the current user
export async function POST(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(`blog-react:${userId}`, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const type = String((body as { type?: string })?.type || '').toLowerCase();
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
  }

  const post = await db.blogPost.findUnique({
    where: { slug: params.slug, published: true },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const existing = await db.blogReaction.findUnique({
    where: { postId_userId_type: { postId: post.id, userId, type } },
  });

  if (existing) {
    await db.blogReaction.delete({ where: { id: existing.id } });
  } else {
    await db.blogReaction.create({ data: { postId: post.id, userId, type } });
  }

  return NextResponse.json(await loadCounts(post.id, userId));
}
