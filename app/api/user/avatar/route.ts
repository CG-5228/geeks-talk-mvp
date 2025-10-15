import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { saveAvatarBlob } from '@/lib/uploads';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) return NextResponse.json({ error: 'File is required' }, { status: 400 });
  try {
    const url = await saveAvatarBlob((session.user as any).id, file);
    await db.user.update({ where: { id: (session.user as any).id }, data: { image: url } });
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 400 });
  }
}
