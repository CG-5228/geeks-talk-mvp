import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/blog - List published blog posts with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    // Get total count of published posts
    const total = await db.blogPost.count({
      where: { published: true }
    });

    // Get published posts with pagination
    const posts = await db.blogPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      }
    });
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
