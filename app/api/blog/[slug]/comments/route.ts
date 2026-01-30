import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/blog/[slug]/comments - Fetch comments for a blog post
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Find the post by slug
    const post = await db.blogPost.findUnique({
      where: { slug },
      select: { id: true, published: true }
    });

    if (!post || !post.published) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Fetch comments
    const comments = await db.blogComment.findMany({
      where: { postId: post.id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          }
        }
      }
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/blog/[slug]/comments - Add a comment to a blog post (requires auth)
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in to comment' }, { status: 401 });
  }

  try {
    const { slug } = params;
    const body = await req.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Comment is too long (max 2000 characters)' }, { status: 400 });
    }

    // Find the post by slug
    const post = await db.blogPost.findUnique({
      where: { slug },
      select: { id: true, published: true }
    });

    if (!post || !post.published) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Create the comment
    const comment = await db.blogComment.create({
      data: {
        postId: post.id,
        authorId: session.user.id,
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          }
        }
      }
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
