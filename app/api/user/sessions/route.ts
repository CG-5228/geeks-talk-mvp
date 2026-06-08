import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SESSION_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

async function getCurrentSessionToken(): Promise<string | null> {
  const jar = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    const v = jar.get(name)?.value;
    if (v) return v;
  }
  return null;
}

function describeUserAgent(ua: string | null): string {
  if (!ua) return 'This device';
  const lower = ua.toLowerCase();
  let os = 'Unknown OS';
  if (lower.includes('mac os x') || lower.includes('macintosh')) os = 'macOS';
  else if (lower.includes('windows')) os = 'Windows';
  else if (lower.includes('android')) os = 'Android';
  else if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios')) os = 'iOS';
  else if (lower.includes('linux')) os = 'Linux';
  let browser = 'Browser';
  if (lower.includes('edg/')) browser = 'Edge';
  else if (lower.includes('chrome/') && !lower.includes('chromium')) browser = 'Chrome';
  else if (lower.includes('firefox/')) browser = 'Firefox';
  else if (lower.includes('safari/')) browser = 'Safari';
  return `${browser} on ${os}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentToken = await getCurrentSessionToken();

  const dbSessions = await db.session.findMany({
    where: { userId: session.user.id, expires: { gt: new Date() } },
    select: { id: true, sessionToken: true, expires: true },
    orderBy: { expires: 'desc' },
  });

  if (dbSessions.length > 0) {
    return NextResponse.json({
      mode: 'database',
      sessions: dbSessions.map((s) => ({
        id: s.id,
        expires: s.expires,
        current: currentToken ? s.sessionToken === currentToken : false,
        label: 'Session',
      })),
    });
  }

  const jwt = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const expSec = (jwt?.exp as number | undefined) ?? null;
  const expires = expSec ? new Date(expSec * 1000) : null;

  return NextResponse.json({
    mode: 'jwt',
    sessions: [
      {
        id: 'current',
        current: true,
        expires: expires ? expires.toISOString() : null,
        label: describeUserAgent(req.headers.get('user-agent')),
      },
    ],
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const scope = searchParams.get('scope');

  const currentToken = await getCurrentSessionToken();

  const dbCount = await db.session.count({ where: { userId: session.user.id } });
  if (dbCount === 0) {
    return NextResponse.json(
      {
        error:
          'Session revocation is not available in JWT mode. Sign out from this device to end it.',
      },
      { status: 400 },
    );
  }

  if (scope === 'others') {
    await db.session.deleteMany({
      where: {
        userId: session.user.id,
        ...(currentToken ? { NOT: { sessionToken: currentToken } } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (!id) return NextResponse.json({ error: 'Missing session id' }, { status: 400 });

  const target = await db.session.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, sessionToken: true },
  });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.session.delete({ where: { id: target.id } });
  return NextResponse.json({ ok: true, revokedSelf: target.sessionToken === currentToken });
}
