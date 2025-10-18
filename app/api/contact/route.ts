import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
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

  const html = `
    <h2>New Contact Message</h2>
    <p><strong>User:</strong> ${session.user.email}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Message:</strong></p>
    <pre style="white-space:pre-wrap">${message}</pre>
    <p><small>Message ID: ${saved.id}</small></p>
  `;

  await sendEmail({ subject: `[Contact] ${subject}`, html });

  return NextResponse.json({ ok: true, id: saved.id });
}


