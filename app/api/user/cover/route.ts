import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadToS3 } from '@/lib/s3';
import { rateLimit } from '@/lib/rateLimit';
import { sniffImageType } from '@/lib/uploads';

const MAX = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'local';
  const rl = await rateLimit(`cover:${session.user.id}:${ip}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many uploads' }, { status: 429 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 });
  // Explicitly reject SVG (XSS vector) before any other checks.
  if (file.type === 'image/svg+xml') {
    return NextResponse.json({ error: 'SVG images are not allowed' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only images allowed' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  // Validate by magic bytes — never trust client mime/extension.
  const sniffed = sniffImageType(buf);
  if (sniffed !== 'image/png' && sniffed !== 'image/jpeg' && sniffed !== 'image/gif' && sniffed !== 'image/webp') {
    return NextResponse.json({ error: 'Only images allowed' }, { status: 400 });
  }

  const result = await uploadToS3(buf, file.name || 'cover', `covers/${session.user.id}`, sniffed);

  await db.user.update({
    where: { id: session.user.id },
    data: { coverImage: result.url },
  });

  return NextResponse.json({ ok: true, url: result.url });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await db.user.update({ where: { id: session.user.id }, data: { coverImage: null } });
  return NextResponse.json({ ok: true });
}
