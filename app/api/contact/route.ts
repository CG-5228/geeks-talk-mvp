import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmailWithFallback } from '@/lib/emailResend';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'unknown';
  const key = `contact:${session.user.id}:${ip}`;
  const rl = rateLimit(key, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const subject = (body?.subject || '').trim();
  const message = (body?.message || '').trim();
  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
  }

  const saved = await db.contactMessage.create({
    data: {
      userId: (session.user as any).id,
      subject,
      message,
    },
  });

  // Track contact message for analytics
  try {
    const { updateDailyStats } = await import('@/lib/analytics');
    await updateDailyStats(new Date(), 'contact');
  } catch (error) {
    console.error('Failed to track contact message:', error);
  }

  const html = `
    <h2>New Contact Message</h2>
    <p><strong>User:</strong> ${session.user.email}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Message:</strong></p>
    <pre style="white-space:pre-wrap">${message}</pre>
    <p><small>Message ID: ${saved.id}</small></p>
  `;

  // Use Resend HTTP API first, fallback to SMTP if configured
  const fromAddr = process.env.EMAIL_NO_REPLY || 'onboarding@resend.dev';
  const toAddr = process.env.CONTACT_INBOX || process.env.EMAIL_TO || 'chris.g@geekstalk.co';
  const delivered = await sendEmailWithFallback({ subject: `[Contact] ${subject}`, html, from: fromAddr, to: toAddr });

  if (!delivered) {
    return NextResponse.json({ ok: false, id: saved.id, error: 'Email delivery failed (domain not verified or SMTP not configured).' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: saved.id });
}


