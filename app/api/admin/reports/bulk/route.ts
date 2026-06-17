import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { logAdminAction } from '@/lib/adminAudit';

const ALLOWED_STATUSES = new Set(['pending', 'resolved', 'rejected']);
const MAX_IDS = 500;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isAdmin(session.user.id);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null) as { reportIds?: unknown; status?: unknown } | null;
  const rawIds = Array.isArray(body?.reportIds) ? body!.reportIds : [];
  const reportIds = rawIds.filter((v): v is string => typeof v === 'string' && v.length > 0);
  const status = typeof body?.status === 'string' ? body!.status : '';

  if (reportIds.length === 0) {
    return NextResponse.json({ error: 'reportIds must be a non-empty array of strings' }, { status: 400 });
  }
  if (reportIds.length > MAX_IDS) {
    return NextResponse.json({ error: `At most ${MAX_IDS} reports per request` }, { status: 400 });
  }
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: `status must be one of ${[...ALLOWED_STATUSES].join(', ')}` }, { status: 400 });
  }

  const result = await db.userReport.updateMany({
    where: { id: { in: reportIds } },
    data: { status, reviewedBy: session.user.id, reviewedAt: new Date() },
  });

  await logAdminAction({
    adminId: session.user.id,
    action: 'report.bulk_update',
    targetType: 'report',
    summary: `${result.count} reports → ${status}`,
    metadata: { status, requested: reportIds.length, updated: result.count, reportIds: reportIds.slice(0, 50) },
    req,
  });

  return NextResponse.json({ updated: result.count, status });
}
