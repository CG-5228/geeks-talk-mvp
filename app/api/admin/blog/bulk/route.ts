import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { db } from '@/lib/db';

type BulkAction = 'publish' | 'unpublish' | 'feature' | 'unfeature' | 'delete';

// POST /api/admin/blog/bulk — batch operations on blog posts
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
    const body = (await req.json()) as { action?: BulkAction; ids?: string[] };
    const { action, ids } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'action and ids[] are required' }, { status: 400 });
    }

    const valid: BulkAction[] = ['publish', 'unpublish', 'feature', 'unfeature', 'delete'];
    if (!valid.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'delete') {
      await db.blogComment.deleteMany({ where: { postId: { in: ids } } });
      await db.blogReaction.deleteMany({ where: { postId: { in: ids } } });
      const result = await db.blogPost.deleteMany({ where: { id: { in: ids } } });
      return NextResponse.json({ success: true, count: result.count });
    }

    let data: Record<string, unknown> = {};
    if (action === 'publish') {
      data = { published: true, publishedAt: new Date() };
    } else if (action === 'unpublish') {
      data = { published: false, publishedAt: null };
    } else if (action === 'feature') {
      data = { featured: true };
    } else if (action === 'unfeature') {
      data = { featured: false };
    }

    const result = await db.blogPost.updateMany({ where: { id: { in: ids } }, data });
    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Failed to bulk update blog posts:', error);
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 });
  }
}
