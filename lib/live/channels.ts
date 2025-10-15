import type { Room } from '@prisma/client';
import { db } from '@/lib/db';
import { Channel, Visibility } from '@/types/live';
import { nanoid } from 'nanoid';

const PUBLIC_CHANNELS = [
  { name: 'General', category: 'General' },
  { name: 'Computer General', category: 'Computer General' },
  { name: 'Programming', category: 'Programming' },
  { name: 'Cybersecurity', category: 'Cybersecurity' },
  { name: 'Mathematics', category: 'Mathematics' },
];

// In-memory fallback store
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
      db.room.findMany({ where: { visibility: 'public' }, orderBy: { createdAt: 'asc' } }),
      userId
        ? db.room.findMany({ where: { visibility: 'private', ownerId: userId }, orderBy: { createdAt: 'desc' } })
        : Promise.resolve([]),
    ]);
    return {
      public: publicRooms.map(toChannel),
      privateOwned: privateRooms.map(toChannel),
    };
  } catch (error) {
    console.error('Failed to fetch channels from database, falling back to memory:', error);
    ensureMemSeed();
    const publicList = mem.channels.filter((c) => c.visibility === 'public');
    const privateOwned = userId ? mem.channels.filter((c) => c.visibility === 'private' && c.ownerId === userId) : [];
    return { public: publicList, privateOwned };
  }
}

export async function createPrivateChannel(ownerId: string, name: string, topic?: string) {
  const slug = `${slugify(name)}-${nanoid(6)}`;
  const inviteCode = nanoid(10);
  try {
    const created = await db.room.create({
      data: { name, slug, topic, visibility: 'private', category: 'Private', ownerId, inviteCode },
    });
    return toChannel(created);
  } catch (error) {
    console.error('Failed to create channel in database, falling back to memory:', error);
    ensureMemSeed();
    const ch: Channel = {
      id: `mem-${nanoid(8)}`,
      name,
      slug,
      topic: topic ?? null,
      visibility: 'private',
      category: 'Private',
      ownerId,
      inviteCode,
      createdAt: new Date().toISOString(),
    };
    mem.channels.unshift(ch);
    return ch;
  }
}
