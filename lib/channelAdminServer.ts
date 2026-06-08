import type { Prisma } from '@prisma/client';
import { db } from './db';

/* ================================================================
 *  Channel admin — server helpers
 *  ----------------------------------------------------------------
 *  Everything in this module returns JSON-safe shapes (ISO strings,
 *  primitive numbers) so route handlers can `NextResponse.json()` the
 *  result directly.
 * ================================================================ */

export const CHANNEL_CATEGORIES = [
  'General',
  'Programming',
  'Mathematics',
  'Cybersecurity',
  'Computer General',
  'Private',
] as const;
export type ChannelCategory = (typeof CHANNEL_CATEGORIES)[number];

export const MODERATION_STATUSES = ['pending', 'approved', 'flagged', 'rejected'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  image: true,
  onlineStatus: true,
  role: true,
  createdAt: true,
} as const;

type UserLite = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
  onlineStatus: string;
  role: string;
  createdAt: Date;
};

/* ---------------------------------------------------------------- */
/*  Overview                                                         */
/* ---------------------------------------------------------------- */

export interface ChannelOverview {
  channel: {
    id: string;
    name: string;
    slug: string;
    topic: string | null;
    visibility: string;
    category: string;
    archived: boolean;
    isVoice: boolean;
    isDM: boolean;
    inviteCode: string | null;
    ownerId: string | null;
    owner: UserLite | null;
    createdAt: string;
  };
  counts: {
    messages: number;
    members: number;
    files: number;
    voiceGroups: number;
    pinned: number;
    moderation: Record<ModerationStatus, number>;
  };
  activity: {
    last24h: number;
    last7d: number;
    last30d: number;
    lastMessageAt: string | null;
    hourly: Array<{ hour: string; count: number }>; // last 24h, oldest → newest
  };
  topContributors: Array<{
    user: UserLite;
    messages: number;
  }>;
}

/**
 * Single fetch that gathers metadata + message/member/file totals + activity
 * statistics for a channel. Uses parallel queries; all time windows are
 * computed with JS Date math (no SQL).
 */
export async function fetchChannelOverview(channelId: string): Promise<ChannelOverview | null> {
  const channel = await db.room.findUnique({
    where: { id: channelId },
    include: {
      owner: { select: USER_SELECT },
    },
  });
  if (!channel) return null;

  const now = Date.now();
  const d24 = new Date(now - 24 * 60 * 60 * 1000);
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    messages,
    memberCount,
    fileCount,
    voiceGroups,
    pinned,
    mPending,
    mApproved,
    mFlagged,
    mRejected,
    msgs24h,
    msgs7d,
    msgs30d,
    lastMessage,
    recentWindow,
    topByMessages,
  ] = await Promise.all([
    db.message.count({ where: { roomId: channelId } }),
    db.user.count({ where: { rooms: { some: { id: channelId } } } }),
    db.channelFile.count({ where: { channelId } }),
    db.voiceGroup.count({ where: { channelId } }),
    db.message.count({ where: { roomId: channelId, pinnedAt: { not: null } } }),
    db.message.count({ where: { roomId: channelId, moderationStatus: 'pending' } }),
    db.message.count({ where: { roomId: channelId, moderationStatus: 'approved' } }),
    db.message.count({ where: { roomId: channelId, moderationStatus: 'flagged' } }),
    db.message.count({ where: { roomId: channelId, moderationStatus: 'rejected' } }),
    db.message.count({ where: { roomId: channelId, createdAt: { gte: d24 } } }),
    db.message.count({ where: { roomId: channelId, createdAt: { gte: d7 } } }),
    db.message.count({ where: { roomId: channelId, createdAt: { gte: d30 } } }),
    db.message.findFirst({
      where: { roomId: channelId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    db.message.findMany({
      where: { roomId: channelId, createdAt: { gte: d24 } },
      select: { createdAt: true },
      take: 10_000,
    }),
    db.message.groupBy({
      by: ['authorId'],
      where: { roomId: channelId },
      _count: { authorId: true },
      orderBy: { _count: { authorId: 'desc' } },
      take: 5,
    }),
  ]);

  // Build a 24-bucket histogram (oldest hour first).
  const buckets = new Map<string, number>();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now - i * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    buckets.set(d.toISOString(), 0);
  }
  for (const row of recentWindow) {
    const key = new Date(row.createdAt);
    key.setMinutes(0, 0, 0);
    const iso = key.toISOString();
    if (buckets.has(iso)) buckets.set(iso, buckets.get(iso)! + 1);
  }
  const hourly = Array.from(buckets.entries()).map(([hour, count]) => ({ hour, count }));

  // Hydrate top contributors with user records.
  const contribIds = topByMessages.map((t) => t.authorId);
  const contribUsers = contribIds.length
    ? await db.user.findMany({
        where: { id: { in: contribIds } },
        select: USER_SELECT,
      })
    : [];
  const userById = new Map(contribUsers.map((u) => [u.id, u]));
  const topContributors = topByMessages
    .map((row) => {
      const user = userById.get(row.authorId);
      if (!user) return null;
      return { user, messages: row._count.authorId };
    })
    .filter((x): x is { user: UserLite; messages: number } => Boolean(x));

  return {
    channel: {
      id: channel.id,
      name: channel.name,
      slug: channel.slug,
      topic: channel.topic,
      visibility: channel.visibility,
      category: channel.category,
      archived: channel.archived,
      isVoice: channel.isVoice,
      isDM: channel.isDM,
      inviteCode: channel.inviteCode,
      ownerId: channel.ownerId,
      owner: channel.owner,
      createdAt: channel.createdAt.toISOString(),
    },
    counts: {
      messages,
      members: memberCount,
      files: fileCount,
      voiceGroups,
      pinned,
      moderation: {
        pending: mPending,
        approved: mApproved,
        flagged: mFlagged,
        rejected: mRejected,
      },
    },
    activity: {
      last24h: msgs24h,
      last7d: msgs7d,
      last30d: msgs30d,
      lastMessageAt: lastMessage?.createdAt.toISOString() ?? null,
      hourly,
    },
    topContributors,
  };
}

/* ---------------------------------------------------------------- */
/*  Members                                                          */
/* ---------------------------------------------------------------- */

export interface ChannelMemberRow {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  image: string | null;
  onlineStatus: string;
  role: string;
  isOwner: boolean;
  messagesInChannel: number;
  joinedAt: string; // best-effort: user.createdAt fallback (no membership timestamp yet)
}

export interface MembersArgs {
  channelId: string;
  q?: string;
  role?: 'all' | 'user' | 'admin' | 'super-admin';
  online?: 'all' | 'online' | 'offline';
  orderBy?: 'name' | 'username' | 'messages' | 'joinedAt';
  orderDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Paged list of channel members with an annotated per-channel message
 * count. The Room⇄User membership has no timestamp, so `joinedAt` falls
 * back to `user.createdAt` — UI should label it as "member since."
 */
export async function fetchChannelMembers(args: MembersArgs): Promise<{
  rows: ChannelMemberRow[];
  total: number;
  ownerId: string | null;
}> {
  const {
    channelId,
    q = '',
    role = 'all',
    online = 'all',
    orderBy = 'name',
    orderDir = 'asc',
    page = 1,
    limit = 50,
  } = args;

  const room = await db.room.findUnique({
    where: { id: channelId },
    select: { id: true, ownerId: true },
  });
  if (!room) return { rows: [], total: 0, ownerId: null };

  const userWhere: Prisma.UserWhereInput = {
    rooms: { some: { id: channelId } },
  };

  if (q.trim()) {
    const needle = q.trim();
    userWhere.OR = [
      { name: { contains: needle, mode: 'insensitive' } },
      { username: { contains: needle, mode: 'insensitive' } },
      { email: { contains: needle, mode: 'insensitive' } },
    ];
  }
  if (role !== 'all') userWhere.role = role;
  if (online === 'online') userWhere.onlineStatus = { not: 'offline' };
  if (online === 'offline') userWhere.onlineStatus = 'offline';

  const prismaOrder: Prisma.UserOrderByWithRelationInput =
    orderBy === 'username'
      ? { username: orderDir }
      : orderBy === 'joinedAt'
        ? { createdAt: orderDir }
        : { name: orderDir };

  // 'messages' ordering is done in JS after we fetch counts.
  const [total, users] = await Promise.all([
    db.user.count({ where: userWhere }),
    db.user.findMany({
      where: userWhere,
      select: USER_SELECT,
      orderBy: orderBy === 'messages' ? { name: orderDir } : prismaOrder,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const userIds = users.map((u) => u.id);
  const counts = userIds.length
    ? await db.message.groupBy({
        by: ['authorId'],
        where: { roomId: channelId, authorId: { in: userIds } },
        _count: { authorId: true },
      })
    : [];
  const countByUser = new Map(counts.map((c) => [c.authorId, c._count.authorId]));

  let rows: ChannelMemberRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    image: u.image,
    onlineStatus: u.onlineStatus ?? 'offline',
    role: u.role ?? 'user',
    isOwner: u.id === room.ownerId,
    messagesInChannel: countByUser.get(u.id) ?? 0,
    joinedAt: u.createdAt.toISOString(),
  }));

  if (orderBy === 'messages') {
    rows.sort((a, b) =>
      orderDir === 'asc'
        ? a.messagesInChannel - b.messagesInChannel
        : b.messagesInChannel - a.messagesInChannel,
    );
  }

  return { rows, total, ownerId: room.ownerId };
}

/* ---------------------------------------------------------------- */
/*  Messages                                                         */
/* ---------------------------------------------------------------- */

export interface ChannelMessageRow {
  id: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  pinnedAt: string | null;
  unsent: boolean;
  moderationStatus: string;
  spamScore: number;
  replyToId: string | null;
  author: UserLite;
  fileCount: number;
  replyCount: number;
}

export interface MessagesArgs {
  channelId: string;
  q?: string;
  moderation?: 'all' | ModerationStatus;
  pinned?: 'all' | 'pinned' | 'unpinned';
  authorId?: string;
  since?: string; // ISO date
  before?: string; // cursor: messageId — returns messages strictly older than this
  limit?: number;
}

export async function fetchChannelMessages(args: MessagesArgs): Promise<{
  rows: ChannelMessageRow[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const {
    channelId,
    q = '',
    moderation = 'all',
    pinned = 'all',
    authorId,
    since,
    before,
    limit = 50,
  } = args;

  const clamped = Math.min(200, Math.max(1, limit));

  const where: Prisma.MessageWhereInput = { roomId: channelId };
  if (q.trim()) where.content = { contains: q.trim(), mode: 'insensitive' };
  if (moderation !== 'all') where.moderationStatus = moderation;
  if (pinned === 'pinned') where.pinnedAt = { not: null };
  if (pinned === 'unpinned') where.pinnedAt = null;
  if (authorId) where.authorId = authorId;
  if (since) {
    const d = new Date(since);
    if (!Number.isNaN(d.getTime())) where.createdAt = { gte: d };
  }

  if (before) {
    const cursor = await db.message.findUnique({
      where: { id: before },
      select: { createdAt: true },
    });
    if (cursor) where.createdAt = { ...(where.createdAt as object), lt: cursor.createdAt };
  }

  const raw = await db.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: clamped + 1,
    include: {
      author: { select: USER_SELECT },
      _count: { select: { files: true, replies: true } },
    },
  });

  const hasMore = raw.length > clamped;
  const slice = hasMore ? raw.slice(0, clamped) : raw;

  const rows: ChannelMessageRow[] = slice.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    pinnedAt: m.pinnedAt?.toISOString() ?? null,
    unsent: m.unsent,
    moderationStatus: m.moderationStatus,
    spamScore: m.spamScore,
    replyToId: m.replyToId,
    author: m.author,
    fileCount: m._count.files,
    replyCount: m._count.replies,
  }));

  return {
    rows,
    hasMore,
    nextCursor: hasMore ? rows[rows.length - 1]!.id : null,
  };
}

/* ---------------------------------------------------------------- */
/*  Files                                                            */
/* ---------------------------------------------------------------- */

export interface ChannelFileRow {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  createdAt: string;
  uploader: UserLite | null;
  usageCount: number;
}

export async function fetchChannelFiles(args: {
  channelId: string;
  q?: string;
  orderBy?: 'createdAt' | 'fileName' | 'fileSize';
  orderDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<{ rows: ChannelFileRow[]; total: number }> {
  const { channelId, q = '', orderBy = 'createdAt', orderDir = 'desc', page = 1, limit = 50 } = args;

  const where: Prisma.ChannelFileWhereInput = { channelId };
  if (q.trim()) {
    where.OR = [
      { fileName: { contains: q.trim(), mode: 'insensitive' } },
      { fileType: { contains: q.trim(), mode: 'insensitive' } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.channelFile.count({ where }),
    db.channelFile.findMany({
      where,
      include: {
        uploader: { select: USER_SELECT },
        _count: { select: { messageFiles: true } },
      },
      orderBy: { [orderBy]: orderDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    rows: rows.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      s3Key: f.s3Key,
      createdAt: f.createdAt.toISOString(),
      uploader: f.uploader,
      usageCount: f._count.messageFiles,
    })),
    total,
  };
}

/* ---------------------------------------------------------------- */
/*  Audit trail                                                      */
/* ---------------------------------------------------------------- */

export interface ChannelAuditRow {
  id: string;
  action: string;
  summary: string | null;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  admin: UserLite | null;
}

/**
 * All admin audit log entries that target this channel. We key on
 * targetType + targetId; bulk events that contain the id only in metadata
 * are not picked up — the bulk summary already shows aggregate info on
 * the bulk actor's own page.
 */
export async function fetchChannelAudit(channelId: string, limit = 50): Promise<ChannelAuditRow[]> {
  const rows = await db.adminAuditLog.findMany({
    where: { targetType: 'channel', targetId: channelId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(200, Math.max(1, limit)),
    include: { admin: { select: USER_SELECT } },
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    summary: r.summary,
    metadata: r.metadata,
    ip: r.ip,
    userAgent: r.userAgent,
    createdAt: r.createdAt.toISOString(),
    admin: r.admin,
  }));
}
