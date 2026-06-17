import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateLiveKitToken } from '@/lib/livekit';
import { rateLimit } from '@/lib/rateLimit';
import { redisQueue } from '@/lib/redis';
import { z } from 'zod';

// Validation schema for room name
const RoomNameSchema = z.string()
  .min(1)
  .max(50)
  .regex(/^[a-zA-Z0-9-_]+$/, 'Room name must contain only alphanumeric characters, hyphens, and underscores');

// GET /api/livekit/token?roomName=X - Generate short-lived LiveKit token
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limiting: 10 requests per minute per user (shared Redis-backed limiter).
  const rl = await rateLimit(`livekit-token:${userId}`, 10, 60_000);
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

    // Additional security: ensure room name starts with expected prefix for 1v1 rooms
    if (!roomName.startsWith('1v1-')) {
      return NextResponse.json({
        error: 'Invalid room name format'
      }, { status: 400 });
    }

    // Authorize: the caller must have an active random-match assigned to THIS
    // room (the match store is the source of truth). Stops anyone from minting a
    // token for an arbitrary 1v1 room and eavesdropping on a stranger's call.
    const match = await redisQueue.getMatch(userId);
    if (!match || match.roomName !== roomName) {
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
