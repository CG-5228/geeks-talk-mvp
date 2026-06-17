import { db } from '@/lib/db';

export interface SeedBadge {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: 'cyan' | 'violet' | 'amber' | 'rose' | 'emerald' | 'slate';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const SEED_BADGES: SeedBadge[] = [
  {
    slug: 'welcome',
    name: 'Welcome aboard',
    description: 'Joined the Geeks Talk community.',
    icon: 'Sparkles',
    color: 'cyan',
    rarity: 'common',
  },
  {
    slug: 'verified-email',
    name: 'Verified',
    description: 'Confirmed your email address.',
    icon: 'BadgeCheck',
    color: 'emerald',
    rarity: 'common',
  },
  {
    slug: 'profile-complete',
    name: 'Fully dressed',
    description: 'Completed your profile.',
    icon: 'UserCheck',
    color: 'violet',
    rarity: 'common',
  },
  {
    slug: 'first-comment',
    name: 'Speaks up',
    description: 'Posted your first blog comment.',
    icon: 'MessageSquare',
    color: 'cyan',
    rarity: 'common',
  },
  {
    slug: 'first-post',
    name: 'Author',
    description: 'Published your first blog post.',
    icon: 'PenLine',
    color: 'amber',
    rarity: 'rare',
  },
  {
    slug: 'helpful-ten',
    name: 'Helpful hand',
    description: 'Received 10 likes from the community.',
    icon: 'ThumbsUp',
    color: 'emerald',
    rarity: 'rare',
  },
  {
    slug: 'early-adopter',
    name: 'Early adopter',
    description: 'One of the first 1000 members.',
    icon: 'Rocket',
    color: 'rose',
    rarity: 'epic',
  },
  {
    slug: 'streak-seven',
    name: '7-day streak',
    description: 'Logged in 7 days in a row.',
    icon: 'Flame',
    color: 'amber',
    rarity: 'rare',
  },
  {
    slug: 'two-factor',
    name: 'Fortified',
    description: 'Enabled two-factor authentication.',
    icon: 'ShieldCheck',
    color: 'violet',
    rarity: 'rare',
  },
  {
    slug: 'geek',
    name: 'Certified geek',
    description: 'Because of course.',
    icon: 'Code2',
    color: 'slate',
    rarity: 'legendary',
  },
];

export async function ensureBadgesSeeded(): Promise<void> {
  const existing = await db.badge.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existing.map((b) => b.slug));
  const missing = SEED_BADGES.filter((b) => !existingSlugs.has(b.slug));
  if (missing.length === 0) return;
  await db.badge.createMany({ data: missing, skipDuplicates: true });
}

export async function awardBadge(userId: string, slug: string): Promise<boolean> {
  await ensureBadgesSeeded();
  const badge = await db.badge.findUnique({ where: { slug }, select: { id: true } });
  if (!badge) return false;
  try {
    await db.userBadge.create({ data: { userId, badgeId: badge.id } });
    return true;
  } catch {
    return false;
  }
}

export async function computeBadgesFor(userId: string): Promise<string[]> {
  await ensureBadgesSeeded();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      createdAt: true,
      emailVerified: true,
      bio: true,
      image: true,
      pronouns: true,
      likesCount: true,
      twoFactorEnabled: true,
      _count: {
        select: {
          blogPosts: true,
          blogComments: true,
        },
      },
    },
  });
  if (!user) return [];

  const awarded: string[] = [];
  const tryAward = async (slug: string, condition: boolean) => {
    if (!condition) return;
    const ok = await awardBadge(userId, slug);
    if (ok) awarded.push(slug);
  };

  await tryAward('welcome', true);
  await tryAward('verified-email', Boolean(user.emailVerified));
  await tryAward('profile-complete', Boolean(user.bio && user.image));
  await tryAward('first-comment', user._count.blogComments >= 1);
  await tryAward('first-post', user._count.blogPosts >= 1);
  await tryAward('helpful-ten', (user.likesCount || 0) >= 10);
  await tryAward('two-factor', Boolean(user.twoFactorEnabled));

  const totalUsers = await db.user.count();
  const rank = await db.user.count({ where: { createdAt: { lt: user.createdAt } } });
  if (totalUsers <= 1000 || rank < 1000) {
    await tryAward('early-adopter', true);
  }

  return awarded;
}
