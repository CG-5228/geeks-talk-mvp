import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rateLimit';
import { verifyTurnstile } from '@/lib/captcha';

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const BugSchema = z.object({
  pagePath: z.string().trim().min(1, 'Page is required').max(500),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  steps: z.string().trim().min(5, 'Please describe how to reproduce').max(5000),
  expected: z.string().trim().min(3, 'Expected behavior is required').max(2000),
  actual: z.string().trim().min(3, 'Actual behavior is required').max(2000),
  screenshotUrl: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
  severity: z.enum(SEVERITIES).default('MEDIUM'),
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
  const rl = await rateLimit(`bug:${session.user.id}:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many reports. Please wait a moment.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BugSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message || 'Invalid payload', field: first?.path?.[0] },
      { status: 400 },
    );
  }

  const { pagePath, title, steps, expected, actual, screenshotUrl, severity, captchaToken } = parsed.data;

  const captchaOk = await verifyTurnstile(captchaToken, ip);
  if (!captchaOk) {
    return NextResponse.json({ error: 'Captcha verification failed.' }, { status: 403 });
  }

  const saved = await db.bugReport.create({
    data: {
      userId: session.user.id,
      pagePath,
      title,
      steps,
      expected,
      actual,
      screenshotUrl,
      severity,
    },
  });

  const html = `
    <h2>New Bug Report — ${escapeHtml(severity)}</h2>
    <p><strong>User:</strong> ${escapeHtml(session.user.email || 'unknown')}</p>
    <p><strong>Severity:</strong> ${escapeHtml(severity)}</p>
    <p><strong>Page:</strong> ${escapeHtml(pagePath)}</p>
    <p><strong>Title:</strong> ${escapeHtml(title)}</p>
    <p><strong>Steps to reproduce:</strong></p>
    <pre style="white-space:pre-wrap;background:#f6f8fa;border-radius:8px;padding:12px">${escapeHtml(steps)}</pre>
    <p><strong>Expected:</strong></p>
    <pre style="white-space:pre-wrap;background:#f6f8fa;border-radius:8px;padding:12px">${escapeHtml(expected)}</pre>
    <p><strong>Actual:</strong></p>
    <pre style="white-space:pre-wrap;background:#f6f8fa;border-radius:8px;padding:12px">${escapeHtml(actual)}</pre>
    ${screenshotUrl ? `<p><strong>Screenshot:</strong> <a href="${escapeHtml(screenshotUrl)}">${escapeHtml(screenshotUrl)}</a></p>` : ''}
    <p style="color:#6b7280;font-size:12px">Report ID: ${saved.id}</p>
  `;

  await sendEmail({ subject: `[Bug] ${severity} — ${title}`, html });

  return NextResponse.json({ ok: true, id: saved.id });
}
