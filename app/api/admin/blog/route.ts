import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { calculateReadingTime } from '@/lib/blog/readingTime';

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const t = raw.trim().toLowerCase().slice(0, 32);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 8) break;
  }
  return out;
}

// Helper to generate a URL-friendly slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

// GET /api/admin/blog - Fetch all posts (published + drafts) for admin
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const posts = await db.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { name: true, email: true, image: true }
        },
        _count: {
          select: { comments: true, reactions: true }
        }
      }
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST /api/admin/blog - Create new blog post
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
    const body = await req.json();
    const { title, content, excerpt, coverImage, published, tags, featured } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // Generate unique slug
    let baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    // Check for existing slugs and make unique
    while (await db.blogPost.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const post = await db.blogPost.create({
      data: {
        authorId: session.user.id,
        title,
        slug,
        content,
        excerpt: excerpt || content.substring(0, 200) + '...',
        coverImage: coverImage || null,
        tags: normalizeTags(tags),
        featured: Boolean(featured),
        readingTimeMinutes: calculateReadingTime(content),
        published: published || false,
        publishedAt: published ? new Date() : null,
      },
      include: {
        author: {
          select: { name: true, email: true, image: true }
        },
        _count: {
          select: { comments: true, reactions: true }
        }
      }
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Failed to create blog post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

// PUT /api/admin/blog - Update existing blog post
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, title, content, excerpt, coverImage, published, tags, featured } = body;

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const existingPost = await db.blogPost.findUnique({ where: { id } });
    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // If title changed, generate new slug
    let slug = existingPost.slug;
    if (title && title !== existingPost.title) {
      let baseSlug = generateSlug(title);
      slug = baseSlug;
      let counter = 1;

      while (true) {
        const existing = await db.blogPost.findUnique({ where: { slug } });
        if (!existing || existing.id === id) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Handle publishedAt based on published status change
    let publishedAt = existingPost.publishedAt;
    if (published && !existingPost.published) {
      // Publishing for the first time
      publishedAt = new Date();
    } else if (!published) {
      // Unpublishing
      publishedAt = null;
    }

    const nextContent = content !== undefined ? content : existingPost.content;
    const post = await db.blogPost.update({
      where: { id },
      data: {
        title: title || existingPost.title,
        slug,
        content: nextContent,
        excerpt: excerpt !== undefined ? excerpt : existingPost.excerpt,
        coverImage: coverImage !== undefined ? coverImage : existingPost.coverImage,
        tags: tags !== undefined ? normalizeTags(tags) : existingPost.tags,
        featured: featured !== undefined ? Boolean(featured) : existingPost.featured,
        readingTimeMinutes: content !== undefined
          ? calculateReadingTime(nextContent)
          : existingPost.readingTimeMinutes,
        published: published !== undefined ? published : existingPost.published,
        publishedAt,
      },
      include: {
        author: {
          select: { name: true, email: true, image: true }
        },
        _count: {
          select: { comments: true, reactions: true }
        }
      }
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Failed to update blog post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE /api/admin/blog - Delete blog post
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Delete associated comments first
    await db.blogComment.deleteMany({ where: { postId: id } });

    // Delete the post
    await db.blogPost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete blog post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
