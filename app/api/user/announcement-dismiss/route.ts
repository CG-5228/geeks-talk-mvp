import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const { announcementId } = await req.json();

  if (!announcementId) {
    return NextResponse.json({ error: 'announcementId required' }, { status: 400 });
  }

  // Record DB dismissal for logged-in user
  if (session?.user?.id) {
    // Check if already dismissed
    const existing = await db.announcementDismissal.findFirst({
      where: {
        userId: session.user.id,
        announcementId,
      },
    });

    if (!existing) {
      await db.announcementDismissal.create({
        data: {
          userId: session.user.id,
          announcementId,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
