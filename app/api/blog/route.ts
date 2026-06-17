import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/blog
// Query params:
//   page, limit          — pagination (defaults 1 / 12)
//   q                    — full-text search in title/excerpt/content
//   tag                  — single tag filter
//   featured=true|only   — only return featured posts
//   sort=recent|popular  — default recent (publishedAt desc); popular = viewCount desc
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)));
    const skip = (page - 1) * limit;
    const q = (searchParams.get('q') || '').trim();
    const tag = (searchParams.get('tag') || '').trim();
    const featuredOnly = searchParams.get('featured') === 'only' || searchParams.get('featured') === 'true';
    const sort = searchParams.get('sort') || 'recent';

    const where: Prisma.BlogPostWhereInput = { published: true };
    if (tag) where.tags = { has: tag };
    if (featuredOnly) where.featured = true;
    if (q && q.length >= 2) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { excerpt: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.BlogPostOrderByWithRelationInput =
      sort === 'popular' ? { viewCount: 'desc' } : { publishedAt: 'desc' };

    const [total, posts, featured] = await Promise.all([
      db.blogPost.count({ where }),
      db.blogPost.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          tags: true,
          featured: true,
          viewCount: true,
          readingTimeMinutes: true,
          publishedAt: true,
          createdAt: true,
          author: { select: { id: true, name: true, username: true, image: true } },
          _count: { select: { comments: true, reactions: true } },
        },
      }),
      // Include a small featured block on page 1 unless already filtering
      page === 1 && !tag && !q && !featuredOnly
        ? db.blogPost.findMany({
            where: { published: true, featured: true },
            orderBy: { publishedAt: 'desc' },
            take: 3,
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              coverImage: true,
              tags: true,
              readingTimeMinutes: true,
              publishedAt: true,
              author: { select: { id: true, name: true, username: true, image: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      posts,
      featured,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    });
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
