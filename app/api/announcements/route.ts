import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const scopeParam = (searchParams.get('scope') || 'main').toLowerCase();

  const scope = scopeParam === 'live' ? 'LIVE' : 'MAIN';

  const announcement = await db.siteAnnouncement.findFirst({
    where: { scope, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (!announcement) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bb9359b2-0268-40e1-8961-bb0e3cf8ee2b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'app/api/announcements/route.ts:announcement-null',
        message: 'No active announcement found for scope',
        data: { scope },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return NextResponse.json({ announcement: null });
  }

  // Check DB dismissal for logged-in user
  let dismissed = false;
  if (session?.user?.id) {
    const dismissal = await db.announcementDismissal.findFirst({
      where: {
        userId: session.user.id,
        announcementId: announcement.id,
      },
    });
    dismissed = !!dismissal;
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/bb9359b2-0268-40e1-8961-bb0e3cf8ee2b', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId: dismissed ? 'H3' : 'H1',
      location: 'app/api/announcements/route.ts:announcement-found',
      message: 'Announcement fetched in public API',
      data: {
        scope,
        id: announcement.id,
        isActive: announcement.isActive,
        dismissed,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return NextResponse.json({
    announcement: dismissed
      ? null
      : {
          id: announcement.id,
          scope: announcement.scope,
          message: announcement.message,
          variant: announcement.variant,
          behavior: announcement.behavior,
          durationMs: announcement.durationMs,
          dismissKey: announcement.dismissKey,
          updatedAt: announcement.updatedAt,
        },
  });
}

