import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { saveAvatarBlob } from '@/lib/uploads';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(`avatar:${session.user.id}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'File is required' }, { status: 400 });
  try {
    const url = await saveAvatarBlob((session.user as any).id, file);
    await db.user.update({ where: { id: (session.user as any).id }, data: { image: url } });
    return NextResponse.json({ url });
  } catch (e: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Avatar upload failed:', e);
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 400 });
  }
}
