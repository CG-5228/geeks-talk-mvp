import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { logAdminAction } from '@/lib/adminAudit';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isAdmin(session.user.id);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const reports = await db.userReport.findMany({
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      reported: { select: { id: true, name: true, email: true } },
      attachments: true,
    },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json({ reports });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isAdmin(session.user.id);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { reportId, status } = await req.json();
  if (!reportId || !status) return NextResponse.json({ error: 'reportId and status required' }, { status: 400 });

  const updated = await db.userReport.update({ where: { id: reportId }, data: { status, reviewedBy: session.user.id, reviewedAt: new Date() } });

  if (status === 'resolved' || status === 'rejected') {
    await logAdminAction({
      adminId: session.user.id,
      action: status === 'resolved' ? 'report.resolve' : 'report.reject',
      targetType: 'report',
      targetId: reportId,
      metadata: { status },
      req,
    });
  }

  return NextResponse.json({ id: updated.id, status: updated.status });
}


