import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmailWithFallback } from '@/lib/emailResend';
import { rateLimit } from '@/lib/rateLimit';
import { verifyTurnstile } from '@/lib/captcha';

const TOPICS = ['general', 'partnership', 'press', 'support', 'billing', 'feedback'] as const;
type Topic = (typeof TOPICS)[number];

const TOPIC_LABELS: Record<Topic, string> = {
  general: 'General',
  partnership: 'Partnership',
  press: 'Press',
  support: 'Support',
  billing: 'Billing',
  feedback: 'Product feedback',
};

const ContactSchema = z.object({
  topic: z.enum(TOPICS).default('general'),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(200, 'Subject too long'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(5000, 'Message too long'),
  attachments: z.array(z.string().min(1).max(512)).max(5).optional().default([]),
  captchaToken: z.string().optional(),
});

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'unknown';
  const key = `contact:${session.user.id}:${ip}`;
  const rl = await rateLimit(key, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment before sending again.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message || 'Invalid payload', field: first?.path?.[0] },
      { status: 400 },
    );
  }

  const { topic, subject, message, attachments, captchaToken } = parsed.data;

  const captchaOk = await verifyTurnstile(captchaToken, ip);
  if (!captchaOk) {
    return NextResponse.json({ error: 'Captcha verification failed. Please try again.' }, { status: 403 });
  }

  const saved = await db.contactMessage.create({
    data: {
      userId: session.user.id,
      subject,
      message,
      topic,
      attachments,
      status: 'new',
    },
  });

  try {
    const { updateDailyStats } = await import('@/lib/analytics');
    await updateDailyStats(new Date(), 'contact');
  } catch (error) {
    console.error('Failed to track contact message:', error);
  }

  const attachmentsHtml = attachments.length
    ? `<p><strong>Attachments:</strong></p><ul>${attachments
        .map((a) => `<li><a href="${escapeHtml(a)}">${escapeHtml(a)}</a></li>`)
        .join('')}</ul>`
    : '';

  const html = `
    <h2>New ${escapeHtml(TOPIC_LABELS[topic])} Message</h2>
    <p><strong>User:</strong> ${escapeHtml(session.user.email || 'unknown')}</p>
    <p><strong>Topic:</strong> ${escapeHtml(TOPIC_LABELS[topic])}</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <p><strong>Message:</strong></p>
    <pre style="white-space:pre-wrap;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f8fa;border-radius:8px;padding:12px">${escapeHtml(message)}</pre>
    ${attachmentsHtml}
    <p style="color:#6b7280;font-size:12px">Message ID: ${saved.id}</p>
  `;

  const fromAddr = process.env.EMAIL_NO_REPLY || 'no-reply@geekstalk.org';
  const inboxByTopic: Record<Topic, string | undefined> = {
    general: process.env.CONTACT_INBOX,
    partnership: process.env.CONTACT_PARTNERSHIP_INBOX,
    press: process.env.CONTACT_PRESS_INBOX,
    support: process.env.CONTACT_SUPPORT_INBOX,
    billing: process.env.CONTACT_BILLING_INBOX,
    feedback: process.env.CONTACT_FEEDBACK_INBOX,
  };
  const toAddr =
    inboxByTopic[topic] || process.env.CONTACT_INBOX || process.env.EMAIL_TO || 'Chris.G@geekstalk.org';

  const delivered = await sendEmailWithFallback({
    subject: `[${TOPIC_LABELS[topic]}] ${subject}`,
    html,
    from: fromAddr,
    to: toAddr,
  });

  if (!delivered) {
    return NextResponse.json(
      {
        ok: false,
        id: saved.id,
        error: 'Message saved, but email delivery failed. Our team will still see it.',
      },
      { status: 202 },
    );
  }

  return NextResponse.json({ ok: true, id: saved.id });
}
