import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

type ActivityItem = {
  id: string;
  kind: 'post' | 'comment' | 'reaction' | 'like-received';
  createdAt: Date;
  title: string;
  body?: string | null;
  href?: string | null;
  meta?: Record<string, unknown>;
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id ?? null;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const username = searchParams.get('username');
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 50);
  const cursor = searchParams.get('cursor');

  let targetId: string | null = userId;
  if (!targetId && username) {
    const u = await db.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    targetId = u.id;
  }
  if (!targetId) targetId = viewerId;
  if (!targetId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cursorDate = cursor ? new Date(cursor) : new Date();

  const [posts, comments, reactions, likesReceived] = await Promise.all([
    db.blogPost.findMany({
      where: { authorId: targetId, published: true, publishedAt: { lt: cursorDate } },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        viewCount: true,
        _count: { select: { comments: true, reactions: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    }),
    db.blogComment.findMany({
      where: { authorId: targetId, createdAt: { lt: cursorDate } },
      select: {
        id: true,
        content: true,
        createdAt: true,
        post: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    db.blogReaction.findMany({
      where: { userId: targetId, createdAt: { lt: cursorDate } },
      select: {
        id: true,
        type: true,
        createdAt: true,
        post: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    db.userLike.findMany({
      where: { userId: targetId, createdAt: { lt: cursorDate } },
      select: {
        id: true,
        createdAt: true,
        likeCount: true,
        liker: { select: { username: true, displayName: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  const items: ActivityItem[] = [
    ...posts.map((p) => ({
      id: `post:${p.id}`,
      kind: 'post' as const,
      createdAt: p.publishedAt ?? new Date(),
      title: p.title,
      body: p.excerpt,
      href: `/blog/${p.slug}`,
      meta: { views: p.viewCount, comments: p._count.comments, reactions: p._count.reactions },
    })),
    ...comments.map((c) => ({
      id: `comment:${c.id}`,
      kind: 'comment' as const,
      createdAt: c.createdAt,
      title: `Commented on "${c.post.title}"`,
      body: c.content.length > 180 ? `${c.content.slice(0, 180)}…` : c.content,
      href: `/blog/${c.post.slug}`,
    })),
    ...reactions.map((r) => ({
      id: `reaction:${r.id}`,
      kind: 'reaction' as const,
      createdAt: r.createdAt,
      title: `Reacted ${r.type} to "${r.post.title}"`,
      href: `/blog/${r.post.slug}`,
      meta: { type: r.type },
    })),
    ...likesReceived.map((l) => ({
      id: `like:${l.id}`,
      kind: 'like-received' as const,
      createdAt: l.createdAt,
      title: `${l.liker.displayName || l.liker.username || 'Someone'} liked your profile`,
      href: l.liker.username ? `/profile/${l.liker.username}` : null,
      meta: { count: l.likeCount, image: l.liker.image },
    })),
  ];

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const sliced = items.slice(0, limit);
  const nextCursor = sliced.length === limit ? sliced[sliced.length - 1].createdAt.toISOString() : null;

  return NextResponse.json({ items: sliced, nextCursor });
}
