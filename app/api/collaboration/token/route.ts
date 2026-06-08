import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { signCollabToken } from '@/lib/collabToken';

export const dynamic = 'force-dynamic';

// GET /api/collaboration/token?groupId=... — mints a short-lived signed token
// the client passes to the Yjs collaboration WebSocket. Only members of the
// voice group are granted a token, so the unauthenticated WS server can trust
// the signed claim instead of querying the database itself.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groupId = new URL(req.url).searchParams.get('groupId');
  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
  }

  const member = await db.voiceGroupMember.findFirst({
    where: { groupId, userId: session.user.id },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const token = signCollabToken({ userId: session.user.id, groupId }, 300);
  return NextResponse.json({ token });
}
