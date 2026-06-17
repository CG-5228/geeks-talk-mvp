import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { renderContactReplyEmail } from '@/lib/emailTemplates';
import { sendEmailWithFallback } from '@/lib/emailResend';
import { logAdminAction } from '@/lib/adminAudit';
import type { Prisma } from '@prisma/client';

const VALID_STATUS = new Set(['new', 'in-progress', 'resolved']);
const VALID_SORT = new Set(['newest', 'oldest']);

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
  const sort = searchParams.get('sort') || 'newest';
  const q = (searchParams.get('q') || '').trim();

  const where: Prisma.ContactMessageWhereInput = {};
  if (status && VALID_STATUS.has(status)) where.status = status;
  if (q) {
    where.OR = [
      { subject: { contains: q, mode: 'insensitive' } },
      { message: { contains: q, mode: 'insensitive' } },
      { topic: { contains: q, mode: 'insensitive' } },
      { user: { name: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { user: { username: { contains: q, mode: 'insensitive' } } },
    ];
  }

  let orderBy: Prisma.ContactMessageOrderByWithRelationInput = { createdAt: 'desc' };
  if (sort === 'oldest' && VALID_SORT.has(sort)) orderBy = { createdAt: 'asc' };

  const [messages, total, statusCounts] = await Promise.all([
    db.contactMessage.findMany({
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
    db.contactMessage.count({ where }),
    db.contactMessage.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const counts: Record<string, number> = {
    all: 0,
    new: 0,
    'in-progress': 0,
    resolved: 0,
  };
  for (const row of statusCounts) {
    const key = row.status || 'new';
    counts[key] = (counts[key] ?? 0) + row._count._all;
    counts.all += row._count._all;
  }

  return NextResponse.json({
    messages,
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
    const { contactMessageId, message, sendEmail } = await req.json();

    if (!contactMessageId || !message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const contactMessage = await db.contactMessage.findUnique({
      where: { id: contactMessageId },
      include: {
        user: { select: { id: true, name: true, email: true, username: true } },
      },
    });

    if (!contactMessage) {
      return NextResponse.json({ error: 'Contact message not found' }, { status: 404 });
    }

    const reply = await db.contactReply.create({
      data: {
        contactMessageId,
        adminId: session.user.id,
        message: message.trim(),
        sentToEmail: false,
      },
      include: {
        admin: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    let emailSent = false;
    if (sendEmail) {
      try {
        const recipientEmail = contactMessage.user?.email;
        const recipientName =
          contactMessage.user?.name || contactMessage.user?.username || 'User';

        if (recipientEmail) {
          const emailHtml = renderContactReplyEmail(
            recipientName,
            contactMessage.subject,
            reply.message,
          );
          emailSent = await sendEmailWithFallback({
            to: recipientEmail,
            subject: `Re: ${contactMessage.subject} — GeeksTalk Support`,
            html: emailHtml,
          });
        }
      } catch (emailError) {
        console.error('Failed to send contact reply email:', emailError);
      }

      if (emailSent) {
        await db.contactReply.update({
          where: { id: reply.id },
          data: { sentToEmail: true },
        });
      }
    }

    await logAdminAction({
      adminId: session.user.id,
      action: 'contact.reply',
      targetType: 'contact',
      targetId: contactMessageId,
      summary: `${sendEmail ? (emailSent ? 'Reply + email' : 'Reply (email failed)') : 'Internal note'}: ${reply.message.slice(0, 80)}`,
      metadata: { sendEmail: !!sendEmail, emailSent },
      req,
    });

    return NextResponse.json({
      success: true,
      reply: { ...reply, sentToEmail: emailSent },
    });
  } catch (error) {
    console.error('Failed to create contact reply:', error);
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
    const { messageId, status } = await req.json();

    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }
    if (!status || !VALID_STATUS.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await db.contactMessage.update({
      where: { id: messageId },
      data: { status },
    });

    await logAdminAction({
      adminId: session.user.id,
      action: 'contact.status_update',
      targetType: 'contact',
      targetId: messageId,
      summary: `→ ${status}`,
      metadata: { status },
      req,
    });

    return NextResponse.json({ success: true, message: updated });
  } catch (error) {
    console.error('Failed to update contact message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
