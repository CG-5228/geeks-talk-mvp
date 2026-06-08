import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateLiveKitToken } from '@/lib/livekit';
import { rateLimit } from '@/lib/rateLimit';
import { isVideoRoomMember } from '@/lib/videoRooms';
import { z } from 'zod';

// Validation schema for room name
const RoomNameSchema = z.string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9-_]+$/, 'Room name must contain only alphanumeric characters, hyphens, and underscores');

// GET /api/video/token?roomName=X - Generate LiveKit token for video rooms
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limiting: 10 requests per minute per user (shared Redis-backed limiter).
  const rl = await rateLimit(`video-token:${userId}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get('roomName');

    if (!roomName) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    // Validate room name format with Zod
    const validationResult = RoomNameSchema.safeParse(roomName);
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid room name format',
        details: validationResult.error.issues
      }, { status: 400 });
    }

    // Only users registered for this room (via create / join-by-code / random
    // match) may mint a token — otherwise any authenticated user could join any
    // video room by guessing or replaying a room name.
    if (!(await isVideoRoomMember(roomName, userId))) {
      return NextResponse.json({ error: 'Not authorized for this room' }, { status: 403 });
    }

    // Generate short-lived token (5 minutes max)
    const token = await generateLiveKitToken({
      roomName,
      participantName: session.user.name || 'Anonymous',
      participantIdentity: session.user.id,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const livekitUrl = process.env.LIVEKIT_URL;
    if (!livekitUrl) {
      return NextResponse.json({ error: 'LiveKit URL not configured' }, { status: 500 });
    }

    return NextResponse.json({
      token,
      url: livekitUrl,
      expiresIn: 300, // 5 minutes
    });

  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
