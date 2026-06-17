import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { computeBadgesFor, ensureBadgesSeeded } from '@/lib/badges';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id ?? null;

  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const userId = searchParams.get('userId');

  let targetId = userId;
  if (!targetId && username) {
    const u = await db.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    targetId = u.id;
  }
  if (!targetId) targetId = viewerId;
  if (!targetId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureBadgesSeeded();

  if (targetId === viewerId) {
    await computeBadgesFor(targetId);
  }

  const [userBadges, allBadges] = await Promise.all([
    db.userBadge.findMany({
      where: { userId: targetId },
      select: {
        awardedAt: true,
        badge: {
          select: {
            slug: true,
            name: true,
            description: true,
            icon: true,
            color: true,
            rarity: true,
          },
        },
      },
      orderBy: { awardedAt: 'desc' },
    }),
    db.badge.findMany({
      select: { slug: true, name: true, description: true, icon: true, color: true, rarity: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const ownedSlugs = new Set(userBadges.map((b) => b.badge.slug));
  const locked = allBadges.filter((b) => !ownedSlugs.has(b.slug));

  return NextResponse.json({
    earned: userBadges.map((b) => ({ ...b.badge, awardedAt: b.awardedAt })),
    locked,
    total: allBadges.length,
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const awarded = await computeBadgesFor(session.user.id);
  return NextResponse.json({ ok: true, awarded });
}
