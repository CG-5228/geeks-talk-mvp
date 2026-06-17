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

