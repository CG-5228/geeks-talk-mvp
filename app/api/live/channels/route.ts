import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getChannelsForUser,
  createPrivateChannel,
  ALLOWED_CHANNEL_CATEGORIES,
  ALLOWED_SLOW_MODE_SECONDS,
  MAX_MEMBERS_CAP,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  type ChannelCategory,
} from '@/lib/live/channels';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id ?? null;
  const data = await getChannelsForUser(userId);
  return NextResponse.json(data);
}

const NAME_RE = /^[a-zA-Z0-9_-]+$/;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const source = body && typeof body === 'object' ? (body.settings ?? body) : {};

  const rawName = typeof source?.name === 'string' ? source.name : '';
  const rawDescription = typeof source?.description === 'string' ? source.description : '';
  const rawCategory = typeof source?.category === 'string' ? source.category : undefined;
  const rawPassword = typeof source?.password === 'string' ? source.password : '';
  const rawInviteOnly = typeof source?.inviteOnly === 'boolean' ? source.inviteOnly : undefined;
  const rawAllowMemberInvites =
    typeof source?.allowMemberInvites === 'boolean' ? source.allowMemberInvites : undefined;
  const rawSlowMode =
    typeof source?.slowModeSeconds === 'number'
      ? source.slowModeSeconds
      : typeof source?.slowMode === 'number'
      ? source.slowMode
      : undefined;
  const rawMaxMembers = typeof source?.maxMembers === 'number' ? source.maxMembers : undefined;

  const name = rawName.trim();
  if (!name) {
    return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
  }
  if (name.length < 2 || name.length > 50) {
    return NextResponse.json(
      { error: 'Channel name must be between 2 and 50 characters' },
      { status: 400 },
    );
  }
  if (!NAME_RE.test(name)) {
    return NextResponse.json(
      { error: 'Use letters, numbers, hyphens, or underscores only' },
      { status: 400 },
    );
  }

  const description = rawDescription.trim().slice(0, 500) || undefined;

  const category: ChannelCategory | undefined =
    rawCategory && (ALLOWED_CHANNEL_CATEGORIES as readonly string[]).includes(rawCategory)
      ? (rawCategory as ChannelCategory)
      : undefined;

  if (rawPassword) {
    if (rawPassword.length < MIN_PASSWORD_LENGTH || rawPassword.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters` },
        { status: 400 },
      );
    }
  }

  if (
    rawSlowMode !== undefined &&
    !(ALLOWED_SLOW_MODE_SECONDS as readonly number[]).includes(rawSlowMode)
  ) {
    return NextResponse.json(
      { error: 'Invalid slow mode interval' },
      { status: 400 },
    );
  }

  if (
    rawMaxMembers !== undefined &&
    (!Number.isFinite(rawMaxMembers) || rawMaxMembers < 0 || rawMaxMembers > MAX_MEMBERS_CAP)
  ) {
    return NextResponse.json(
      { error: `Maximum members must be between 0 and ${MAX_MEMBERS_CAP}` },
      { status: 400 },
    );
  }
  if (rawMaxMembers !== undefined && rawMaxMembers > 0 && rawMaxMembers < 2) {
    return NextResponse.json(
      { error: 'Maximum members must be at least 2' },
      { status: 400 },
    );
  }

  const ch = await createPrivateChannel(userId, name, {
    topic: description,
    category,
    password: rawPassword || undefined,
    inviteOnly: rawInviteOnly,
    allowMemberInvites: rawAllowMemberInvites,
    slowModeSeconds: rawSlowMode,
    maxMembers: rawMaxMembers,
  });
  return NextResponse.json(ch, { status: 201 });
}
