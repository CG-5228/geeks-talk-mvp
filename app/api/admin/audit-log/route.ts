import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 200;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));
  const cursor = searchParams.get('cursor');
  const action = searchParams.get('action');
  const adminId = searchParams.get('adminId');
  const targetType = searchParams.get('targetType');
  const targetId = searchParams.get('targetId');
  const since = searchParams.get('since');
  const until = searchParams.get('until');

  const where: Prisma.AdminAuditLogWhereInput = {};
  if (action) where.action = action;
  if (adminId) where.adminId = adminId;
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;
  const createdAt: Prisma.DateTimeFilter = {};
  if (since) {
    const d = new Date(since);
    if (!Number.isNaN(d.getTime())) createdAt.gte = d;
  }
  if (until) {
    const d = new Date(until);
    if (!Number.isNaN(d.getTime())) createdAt.lte = d;
  }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

  const rows = await db.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      admin: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  return NextResponse.json({ items, nextCursor });
}
