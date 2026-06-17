import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Measure DB round-trip latency with a trivial query.
  let dbLatencyMs: number | null = null;
  let dbOk = false;
  try {
    const t0 = performance.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Math.round(performance.now() - t0);
    dbOk = true;
  } catch (err) {
    console.error('DB health ping failed:', err);
  }

  const [
    activeSessionsHour,
    onlineUsers,
    totalUsers,
    messagesLastHour,
    messagesLastDay,
    pendingReports,
    openBugs,
    unresolvedContact,
    totalMessages,
    totalRooms,
  ] = await Promise.all([
    db.session.count({ where: { expires: { gt: now } } }).catch(() => 0),
    db.user
      .count({
        where: {
          onlineStatus: 'online',
          lastSeen: { gte: new Date(now.getTime() - 2 * 60 * 1000) },
        },
      })
      .catch(() => 0),
    db.user.count().catch(() => 0),
    db.message.count({ where: { createdAt: { gte: oneHourAgo } } }).catch(() => 0),
    db.message.count({ where: { createdAt: { gte: oneDayAgo } } }).catch(() => 0),
    db.userReport.count({ where: { status: 'pending' } }).catch(() => 0),
    db.bugReport.count({ where: { status: 'open' } }).catch(() => 0),
    db.contactMessage.count({ where: { status: { in: ['new', 'in-progress'] } } }).catch(() => 0),
    db.message.count().catch(() => 0),
    db.room.count().catch(() => 0),
  ]);

  const memoryBytes =
    typeof process !== 'undefined' && typeof process.memoryUsage === 'function'
      ? process.memoryUsage().rss
      : null;
  const uptimeSeconds =
    typeof process !== 'undefined' && typeof process.uptime === 'function'
      ? Math.round(process.uptime())
      : null;

  const build = {
    commitSha:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GITHUB_SHA ||
      process.env.COMMIT_SHA ||
      null,
    branch:
      process.env.VERCEL_GIT_COMMIT_REF ||
      process.env.GITHUB_REF_NAME ||
      null,
    region: process.env.VERCEL_REGION || null,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    nodeVersion: process.version,
  };

  return NextResponse.json({
    timestamp: now.toISOString(),
    db: {
      ok: dbOk,
      latencyMs: dbLatencyMs,
    },
    sessions: {
      activeSessionsHour,
      onlineUsers,
      totalUsers,
    },
    traffic: {
      messagesLastHour,
      messagesLastDay,
    },
    queues: {
      pendingReports,
      openBugs,
      unresolvedContact,
    },
    totals: {
      messages: totalMessages,
      rooms: totalRooms,
    },
    process: {
      memoryBytes,
      uptimeSeconds,
    },
    build,
  });
}
