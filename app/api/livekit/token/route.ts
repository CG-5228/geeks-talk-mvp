import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateLiveKitToken } from '@/lib/livekit';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// GET /api/livekit/token?roomName=X - Generate short-lived LiveKit token
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get('roomName');

    if (!roomName) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    // Validate room name format (prevent injection)
    if (!/^[a-zA-Z0-9-_]+$/.test(roomName)) {
      return NextResponse.json({ error: 'Invalid room name format' }, { status: 400 });
    }

    // Rate limiting: 10 requests per minute per user
    const userId = session.user.id;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 10;

    const userLimit = rateLimitStore.get(userId);
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= maxRequests) {
          return NextResponse.json({ 
            error: 'Rate limit exceeded. Please try again later.' 
          }, { status: 429 });
        }
        userLimit.count++;
      } else {
        // Reset window
        rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs });
      }
    } else {
      rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs });
    }

    // Clean up expired entries
    const keysToDelete: string[] = [];
    rateLimitStore.forEach((value, key) => {
      if (now >= value.resetTime) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => rateLimitStore.delete(key));

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
