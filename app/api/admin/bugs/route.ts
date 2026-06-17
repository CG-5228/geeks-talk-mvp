import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { renderBugReplyEmail } from '@/lib/emailTemplates';
import { sendEmailWithFallback } from '@/lib/emailResend';
import { logAdminAction } from '@/lib/adminAudit';
import type { Prisma } from '@prisma/client';

const VALID_STATUS = new Set(['open', 'in-progress', 'resolved', 'closed']);
const VALID_SEVERITY = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const VALID_SORT = new Set(['newest', 'oldest', 'severity', 'updated']);
const SEVERITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));
  const skip = (page - 1) * limit;

  const status = searchParams.get('status');
  const severity = searchParams.get('severity');
  const sort = searchParams.get('sort') || 'newest';
  const q = (searchParams.get('q') || '').trim();

  const where: Prisma.BugReportWhereInput = {};
  if (status && VALID_STATUS.has(status)) where.status = status;
  if (severity && VALID_SEVERITY.has(severity)) {
    where.severity = severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { steps: { contains: q, mode: 'insensitive' } },
      { actual: { contains: q, mode: 'insensitive' } },
      { pagePath: { contains: q, mode: 'insensitive' } },
    ];
  }

  let orderBy: Prisma.BugReportOrderByWithRelationInput | Prisma.BugReportOrderByWithRelationInput[] =
    { createdAt: 'desc' };
  if (sort === 'oldest') orderBy = { createdAt: 'asc' };
  else if (sort === 'updated') orderBy = { updatedAt: 'desc' };
  // severity sort handled post-query since Prisma enum ordering is alphabetic, not priority

  const [rawBugs, total, statusCounts] = await Promise.all([
    db.bugReport.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, username: true, image: true },
        },
        replies: {
          include: {
            admin: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { replies: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    db.bugReport.count({ where }),
    db.bugReport.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const bugs =
    sort === 'severity'
      ? [...rawBugs].sort((a, b) => {
          const diff = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
          if (diff !== 0) return diff;
          return b.createdAt.getTime() - a.createdAt.getTime();
        })
      : rawBugs;

  const counts = {
    all: 0,
    open: 0,
    'in-progress': 0,
    resolved: 0,
    closed: 0,
  } as Record<string, number>;
  for (const row of statusCounts) {
    counts[row.status] = row._count._all;
    counts.all += row._count._all;
  }

  return NextResponse.json({
    bugs,
    counts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { bugReportId, message, sendEmail } = await req.json();

    if (!bugReportId || !message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const reply = await db.bugReply.create({
      data: {
        bugReportId,
        message: message.trim(),
        sentToEmail: !!sendEmail,
        adminId: session.user.id,
      },
      include: {
        admin: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    await db.bugReport.update({
      where: { id: bugReportId },
      data: { updatedAt: new Date() },
    });

    if (sendEmail) {
      try {
        const bugReport = await db.bugReport.findUnique({
          where: { id: bugReportId },
          include: { user: { select: { name: true, email: true } } },
        });

        if (bugReport?.user?.email) {
          const emailHtml = renderBugReplyEmail({
            reporterName: bugReport.user.name || 'User',
            bugTitle: bugReport.title,
            adminName: reply.admin.name || 'Admin',
            replyMessage: reply.message,
          });

          await sendEmailWithFallback({
            to: bugReport.user.email,
            subject: `Re: Bug Report - ${bugReport.title}`,
            html: emailHtml,
          });
        }
      } catch (emailError) {
        console.error('Failed to send bug reply email:', emailError);
      }
    }

    await logAdminAction({
      adminId: session.user.id,
      action: 'bug.reply',
      targetType: 'bug',
      targetId: bugReportId,
      summary: `${sendEmail ? 'Reply + email' : 'Internal note'}: ${reply.message.slice(0, 80)}`,
      metadata: { sentToEmail: !!sendEmail },
      req,
    });

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error('Failed to create bug reply:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { bugId, status, severity } = await req.json();

    if (!bugId) {
      return NextResponse.json({ error: 'Missing bugId' }, { status: 400 });
    }

    const data: Prisma.BugReportUpdateInput = {};
    if (status !== undefined) {
      if (!VALID_STATUS.has(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      data.status = status;
    }
    if (severity !== undefined) {
      if (!VALID_SEVERITY.has(severity)) {
        return NextResponse.json({ error: 'Invalid severity' }, { status: 400 });
      }
      data.severity = severity;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updatedBug = await db.bugReport.update({
      where: { id: bugId },
      data,
    });

    await logAdminAction({
      adminId: session.user.id,
      action: status ? 'bug.status_update' : 'bug.severity_update',
      targetType: 'bug',
      targetId: bugId,
      summary: status ? `→ ${status}` : `severity → ${severity}`,
      metadata: { status, severity },
      req,
    });

    return NextResponse.json({ success: true, bug: updatedBug });
  } catch (error) {
    console.error('Failed to update bug:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
