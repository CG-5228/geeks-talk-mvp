import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/blog/[slug] - Get single published blog post by slug
export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  try {
    const { slug } = params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    const post = await db.blogPost.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, name: true, image: true, username: true, bio: true },
        },
        _count: { select: { comments: true, reactions: true } },
      },
    });

    if (!post || !post.published) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Aggregate reactions by type and include the current user's picks
    const [grouped, userReactions] = await Promise.all([
      db.blogReaction.groupBy({
        by: ['type'],
        where: { postId: post.id },
        _count: { type: true },
      }),
      userId
        ? db.blogReaction.findMany({
            where: { postId: post.id, userId },
            select: { type: true },
          })
        : Promise.resolve([]),
    ]);

    const reactionCounts = grouped.reduce<Record<string, number>>((acc, row) => {
      acc[row.type] = row._count.type;
      return acc;
    }, {});

    return NextResponse.json({
      post,
      reactions: {
        counts: reactionCounts,
        mine: userReactions.map((r) => r.type),
      },
    });
  } catch (error) {
    console.error('Failed to fetch blog post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}
