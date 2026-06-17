import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { renderAdminMessageEmail } from '@/lib/emailTemplates';
import { sendEmailWithFallback } from '@/lib/emailResend';

export async function GET(_req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, email: true, username: true, image: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function POST(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { subject, message, sendEmail } = await req.json();
  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
  }

  const userId = params.userId;

  const user = await db.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const adminMessage = await db.adminMessage.create({
    data: {
      recipientId: userId,
      senderId: session.user.id,
      subject,
      message
    }
  });

  await db.notification.create({
    data: {
      userId,
      type: 'admin_message',
      title: subject,
      message: message,
      metadata: {
        messageId: adminMessage.id,
        senderId: session.user.id
      }
    }
  });

  let emailSent = false;
  if (sendEmail !== false) {
    const emailHtml = renderAdminMessageEmail(
      user.name || user.username || 'User',
      subject,
      message
    );

    emailSent = await sendEmailWithFallback({
      subject: `Message from Geeks Talk Admin: ${subject}`,
      html: emailHtml,
      to: user.email
    });

    await db.adminMessage.update({
      where: { id: adminMessage.id },
      data: { sentToEmail: emailSent }
    });
  }

  if (sendEmail !== false && !emailSent) {
    return NextResponse.json({
      message: 'Message saved to inbox, but email delivery failed. Check email service configuration.',
      adminMessage: {
        id: adminMessage.id,
        subject,
        message,
        sentToEmail: false
      }
    }, { status: 207 });
  }

  return NextResponse.json({
    message: sendEmail === false ? 'Message saved to inbox' : 'Message and email sent successfully',
    adminMessage: {
      id: adminMessage.id,
      subject,
      message,
      sentToEmail: emailSent
    }
  });
}
