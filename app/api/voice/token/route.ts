import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateLiveKitToken } from '@/lib/livekit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const livekitUrl = process.env.LIVEKIT_URL;
    if (!livekitUrl) {
      return NextResponse.json({ error: 'LiveKit URL not configured' }, { status: 500 });
    }

    // Generate LiveKit token for group voice room
    const roomName = `voice-group-${groupId}`;
    const token = await generateLiveKitToken({
      roomName,
      participantName: session.user.name || 'Anonymous',
      participantIdentity: session.user.id,
    });

    return NextResponse.json({
      token,
      url: livekitUrl,
      roomName,
    });

  } catch (error) {
    console.error('Error generating voice token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}