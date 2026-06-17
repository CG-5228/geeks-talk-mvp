import type { Room } from '@prisma/client';
import { db } from '@/lib/db';
import { Channel, Visibility } from '@/types/live';
import { nanoid } from 'nanoid';
import { hashPassword } from '@/lib/password';

const PUBLIC_CHANNELS = [
  { name: 'General', category: 'General' },
  { name: 'Computer General', category: 'Computer General' },
  { name: 'Programming', category: 'Programming' },
  { name: 'Cybersecurity', category: 'Cybersecurity' },
  { name: 'Mathematics', category: 'Mathematics' },
];

const mem: { channels: Channel[] } = { channels: [] };

const slugify = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-');

function ensureMemSeed() {
  if (mem.channels.length > 0) return;
  const now = new Date().toISOString();
  mem.channels = PUBLIC_CHANNELS.map((c, i) => ({
    id: `mem-${i + 1}`,
    name: c.name,
    slug: slugify(c.name),
    topic: null,
    visibility: 'public',
    category: c.category,
    ownerId: null,
    inviteCode: null,
    createdAt: now,
    hasPassword: false,
    inviteOnly: false,
    allowMemberInvites: true,
    slowModeSeconds: 0,
    maxMembers: 0,
  }));
}

function toChannel(room: Room): Channel {
  const vis: Visibility = room.visibility === 'private' ? 'private' : 'public';
  return {
    id: room.id,
    name: room.name,
    slug: room.slug,
    topic: room.topic ?? null,
    visibility: vis,
    category: room.category,
    ownerId: room.ownerId ?? null,
    inviteCode: room.inviteCode ?? null,
    createdAt: room.createdAt instanceof Date ? room.createdAt.toISOString() : room.createdAt,
    hasPassword: Boolean(room.passwordHash),
    inviteOnly: room.inviteOnly ?? false,
    allowMemberInvites: room.allowMemberInvites ?? true,
    slowModeSeconds: room.slowModeSeconds ?? 0,
    maxMembers: room.maxMembers ?? 0,
  };
}

export async function ensureSeedChannels() {
  try {
    await Promise.all(
      PUBLIC_CHANNELS.map(async (c) => {
        const slug = slugify(c.name);
        await db.room.upsert({
          where: { slug },
          update: { name: c.name, category: c.category, visibility: 'public' },
          create: { name: c.name, slug, category: c.category, visibility: 'public' },
        });
      }),
    );
  } catch {
    ensureMemSeed();
  }
}

export async function getChannelsForUser(userId: string | null) {
  await ensureSeedChannels();
  try {
    const [publicRooms, privateRooms] = await Promise.all([
      db.room.findMany({
        where: {
          visibility: 'public',
          archived: false,
          NOT: { name: 'Random Chat' },
        },
        orderBy: { createdAt: 'asc' },
      }),
      userId
        ? db.room.findMany({
            where: { visibility: 'private', ownerId: userId, archived: false },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);
    const allRoomIds = [...publicRooms.map((r) => r.id), ...privateRooms.map((r) => r.id)];
    const lastMessageByRoom = new Map<string, string>();
    if (allRoomIds.length > 0) {
      const grouped = await db.message.groupBy({
        by: ['roomId'],
        where: { roomId: { in: allRoomIds }, unsent: false },
        _max: { createdAt: true },
      });
      for (const row of grouped) {
        const t = row._max.createdAt;
        if (t) lastMessageByRoom.set(row.roomId, t instanceof Date ? t.toISOString() : String(t));
      }
    }
    const attach = (room: Room): Channel => ({
      ...toChannel(room),
      lastMessageAt: lastMessageByRoom.get(room.id) ?? null,
    });
    return {
      public: publicRooms.map(attach),
      privateOwned: privateRooms.map(attach),
    };
  } catch (error) {
    console.error('Failed to fetch channels from database, falling back to memory:', error);
    ensureMemSeed();
    const publicList = mem.channels.filter(
      (c) => c.visibility === 'public' && c.name !== 'Random Chat',
    );
    const privateOwned = userId
      ? mem.channels.filter((c) => c.visibility === 'private' && c.ownerId === userId)
      : [];
    return { public: publicList, privateOwned };
  }
}

export const ALLOWED_CHANNEL_CATEGORIES = [
  'Private',
  'Team',
  'Project',
  'Learning',
  'Announcements',
  'Community',
] as const;
export type ChannelCategory = (typeof ALLOWED_CHANNEL_CATEGORIES)[number];

export const ALLOWED_SLOW_MODE_SECONDS = [0, 5, 10, 30, 60, 300, 900] as const;
export const MAX_MEMBERS_CAP = 5000;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;

export type CreatePrivateChannelOptions = {
  topic?: string;
  category?: ChannelCategory;
  password?: string;
  inviteOnly?: boolean;
  allowMemberInvites?: boolean;
  slowModeSeconds?: number;
  maxMembers?: number;
};

function normalizeSlowMode(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  const rounded = Math.max(0, Math.floor(v));
  return (ALLOWED_SLOW_MODE_SECONDS as readonly number[]).includes(rounded) ? rounded : 0;
}

function normalizeMaxMembers(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  const rounded = Math.max(0, Math.floor(v));
  if (rounded === 0) return 0;
  if (rounded < 2) return 2;
  return Math.min(rounded, MAX_MEMBERS_CAP);
}

export async function createPrivateChannel(
  ownerId: string,
  name: string,
  options: CreatePrivateChannelOptions = {},
) {
  const slug = `${slugify(name)}-${nanoid(6)}`;
  const inviteCode = nanoid(10);
  const resolvedCategory: ChannelCategory =
    options.category && ALLOWED_CHANNEL_CATEGORIES.includes(options.category)
      ? options.category
      : 'Private';

  const rawPassword =
    typeof options.password === 'string' && options.password.length > 0
      ? options.password
      : null;
  const passwordHash = rawPassword ? await hashPassword(rawPassword) : null;

  const inviteOnly = Boolean(options.inviteOnly);
  const allowMemberInvites = inviteOnly
    ? false
    : options.allowMemberInvites ?? true;
  const slowModeSeconds = normalizeSlowMode(options.slowModeSeconds);
  const maxMembers = normalizeMaxMembers(options.maxMembers);

  try {
    const created = await db.room.create({
      data: {
        name,
        slug,
        topic: options.topic,
        visibility: 'private',
        category: resolvedCategory,
        ownerId,
        inviteCode,
        passwordHash,
        inviteOnly,
        allowMemberInvites,
        slowModeSeconds,
        maxMembers,
      },
    });
    return toChannel(created);
  } catch (error) {
    console.error('Failed to create channel in database, falling back to memory:', error);
    ensureMemSeed();
    const ch: Channel = {
      id: `mem-${nanoid(8)}`,
      name,
      slug,
      topic: options.topic ?? null,
      visibility: 'private',
      category: resolvedCategory,
      ownerId,
      inviteCode,
      createdAt: new Date().toISOString(),
      hasPassword: Boolean(passwordHash),
      inviteOnly,
      allowMemberInvites,
      slowModeSeconds,
      maxMembers,
    };
    mem.channels.unshift(ch);
    return ch;
  }
}
