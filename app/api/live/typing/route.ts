import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { emitToRoom } from '@/lib/socket';

// POST /api/live/typing - Broadcast typing indicator
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { channelId, isTyping } = await req.json();
  
  if (!channelId || typeof isTyping !== 'boolean') {
    return NextResponse.json({ error: 'channelId and isTyping are required' }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const userName = session.user.name || 'User';

  try {
    // Broadcast typing indicator to the channel
    const event = isTyping ? 'typing:start' : 'typing:stop';
    const payload = {
      userId,
      userName,
      channelId,
      timestamp: new Date().toISOString()
    };

    emitToRoom(`channel:${channelId}`, event, payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error broadcasting typing indicator:', error);
    return NextResponse.json({ error: 'Failed to broadcast typing indicator' }, { status: 500 });
  }
}
