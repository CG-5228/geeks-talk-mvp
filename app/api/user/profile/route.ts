import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const UrlOrEmpty = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : null))
  .refine(
    (v) => v === null || /^https?:\/\//i.test(v),
    'Website must start with http:// or https://',
  );

const SocialHandle = z.string().trim().max(64).optional().nullable();

const ProfileSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(24, 'Username is too long (max 24)')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores')
      .optional(),
    displayName: z.string().trim().max(50).optional().nullable(),
    bio: z.string().trim().max(280).optional().nullable(),
    pronouns: z.string().trim().max(30).optional().nullable(),
    location: z.string().trim().max(80).optional().nullable(),
    website: UrlOrEmpty,
    socialLinks: z
      .object({
        twitter: SocialHandle,
        github: SocialHandle,
        linkedin: SocialHandle,
        instagram: SocialHandle,
        youtube: SocialHandle,
      })
      .partial()
      .optional(),
    // Appearance
    accentColor: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #00d4ff')
      .optional()
      .nullable(),
    fontScale: z.enum(['sm', 'md', 'lg']).optional(),
    reducedMotion: z.boolean().optional(),
    colorBlindMode: z.enum(['off', 'protanopia', 'deuteranopia', 'tritanopia']).optional(),
    // Notifications
    emailDigest: z.enum(['off', 'daily', 'weekly']).optional(),
    notifyBlogReplies: z.boolean().optional(),
    notifyDMs: z.boolean().optional(),
    notifyMentions: z.boolean().optional(),
    notifyFollows: z.boolean().optional(),
    // Privacy
    profileVisibility: z.enum(['public', 'friends', 'private']).optional(),
    showOnlineStatus: z.boolean().optional(),
    showEmailOnProfile: z.boolean().optional(),
    dmPermissions: z.enum(['everyone', 'friends', 'nobody']).optional(),
  })
  .strict();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      username: true,
      image: true,
      coverImage: true,
      bio: true,
      displayName: true,
      pronouns: true,
      location: true,
      website: true,
      socialLinks: true,
      accentColor: true,
      fontScale: true,
      reducedMotion: true,
      colorBlindMode: true,
      emailDigest: true,
      notifyBlogReplies: true,
      notifyDMs: true,
      notifyMentions: true,
      notifyFollows: true,
      profileVisibility: true,
      showOnlineStatus: true,
      showEmailOnProfile: true,
      dmPermissions: true,
      twoFactorEnabled: true,
      likesCount: true,
      createdAt: true,
    },
  });
  if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(me);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message || 'Invalid input', field: issue?.path?.[0] },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) update[k] = v;
  }

  if (typeof update.website === 'string' && update.website === '') {
    update.website = null;
  }

  try {
    const updated = await db.user.update({
      where: { id: session.user.id },
      data: update,
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        pronouns: true,
        location: true,
        website: true,
        socialLinks: true,
        image: true,
        coverImage: true,
      },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
