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
  const key = `bug:${session.user.id}:${ip}`;
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

  const pagePath = (body?.pagePath || '').trim();
  const title = (body?.title || '').trim();
  const steps = (body?.steps || '').trim();
  const expected = (body?.expected || '').trim();
  const actual = (body?.actual || '').trim();
  const screenshotUrl = (body?.screenshotUrl || '').trim() || null;
  const severity = (body?.severity || 'MEDIUM').toUpperCase();

  if (!pagePath || !title || !steps || !expected || !actual) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const saved = await db.bugReport.create({
    data: {
      userId: (session.user as any).id,
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
    <h2>New Bug Report</h2>
    <p><strong>User:</strong> ${session.user.email}</p>
    <p><strong>Severity:</strong> ${severity}</p>
    <p><strong>Page:</strong> ${pagePath}</p>
    <p><strong>Title:</strong> ${title}</p>
    <p><strong>Steps:</strong></p>
    <pre style="white-space:pre-wrap">${steps}</pre>
    <p><strong>Expected:</strong></p>
    <pre style="white-space:pre-wrap">${expected}</pre>
    <p><strong>Actual:</strong></p>
    <pre style="white-space:pre-wrap">${actual}</pre>
    ${screenshotUrl ? `<p><strong>Screenshot:</strong> <a href="${screenshotUrl}">${screenshotUrl}</a></p>` : ''}
    <p><small>Report ID: ${saved.id}</small></p>
  `;

  await sendEmail({ subject: `[Bug] ${severity} - ${title}`, html });

  return NextResponse.json({ ok: true, id: saved.id });
}


