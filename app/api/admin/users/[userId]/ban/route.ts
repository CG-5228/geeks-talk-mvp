import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { renderBanEmail } from '@/lib/emailTemplates';
import { sendEmailWithFallback } from '@/lib/emailResend';

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { reason, duration } = await req.json();
  if (!reason || !duration) {
    return NextResponse.json({ error: 'Reason and duration are required' }, { status: 400 });
  }
  
  const userId = params.userId;
  
  // Check if user exists
  const user = await db.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  
  // Prevent banning super admin
  if (user.email === process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Cannot ban super admin' }, { status: 400 });
  }
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + duration);
  
  // Create ban record
  const ban = await db.userBan.create({
    data: {
      userId,
      bannedBy: session.user.id,
      reason,
      duration,
      expiresAt
    }
  });
  
  // Create notification
  await db.notification.create({
    data: {
      userId,
      type: 'ban',
      title: 'Account Suspended',
      message: `Your account has been suspended for ${duration} day${duration > 1 ? 's' : ''}. Reason: ${reason}`,
      metadata: {
        banId: ban.id,
        duration,
        expiresAt: expiresAt.toISOString()
      }
    }
  });
  
  // Send email notification
  const emailHtml = renderBanEmail(
    user.name || user.username || 'User',
    reason,
    duration,
    expiresAt
  );
  
  await sendEmailWithFallback({
    subject: 'Account Suspension Notice - Geeks Talk',
    html: emailHtml,
    to: user.email
  });
  
  return NextResponse.json({ 
    message: 'User banned successfully',
    ban: {
      id: ban.id,
      reason,
      duration,
      expiresAt
    }
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const latestBan = await db.userBan.findFirst({
      where: { userId: params.userId },
      orderBy: { createdAt: 'desc' }
    });
    if (!latestBan) return NextResponse.json({ error: 'No ban found' }, { status: 404 });

    await db.userBan.delete({ where: { id: latestBan.id } });

    await db.notification.create({
      data: {
        userId: params.userId,
        type: 'ban_removed',
        title: 'Account Ban Removed',
        message: 'Your account suspension has been lifted. Please follow community guidelines.',
      }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to unban' }, { status: 500 });
  }
}
