import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { renderContactReplyEmail } from '@/lib/emailTemplates';
import { sendEmailWithFallback } from '@/lib/emailResend';

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
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const skip = (page - 1) * limit;
  
  const [messages, total] = await Promise.all([
    db.contactMessage.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true
          }
        },
        replies: {
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    db.contactMessage.count()
  ]);
  
  return NextResponse.json({
    messages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
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
  
  const { contactMessageId, message } = await req.json();
  if (!contactMessageId || !message) {
    return NextResponse.json({ error: 'Contact message ID and reply message are required' }, { status: 400 });
  }
  
  // Get original contact message
  const contactMessage = await db.contactMessage.findUnique({
    where: { id: contactMessageId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true
        }
      }
    }
  });
  
  if (!contactMessage) {
    return NextResponse.json({ error: 'Contact message not found' }, { status: 404 });
  }
  
  // Create reply
  const reply = await db.contactReply.create({
    data: {
      contactMessageId,
      adminId: session.user.id,
      message
    }
  });
  
  // Send email reply
  const emailHtml = renderContactReplyEmail(
    contactMessage.user.name || contactMessage.user.username || 'User',
    contactMessage.subject,
    message
  );
  
  const emailSent = await sendEmailWithFallback({
    subject: `Re: ${contactMessage.subject} - Geeks Talk Support`,
    html: emailHtml,
    to: contactMessage.user.email
  });
  
  // Update reply with email status
  await db.contactReply.update({
    where: { id: reply.id },
    data: { sentToEmail: emailSent }
  });
  
  return NextResponse.json({ 
    message: 'Reply sent successfully',
    reply: {
      id: reply.id,
      message,
      sentToEmail: emailSent
    }
  });
}
