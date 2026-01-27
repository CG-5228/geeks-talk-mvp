import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nanoid } from 'nanoid';

// In-memory queue for video chat matching (use Redis in production)
const videoQueue = new Map<string, {
  userId: string;
  joinedAt: number;
}>();

// Matches storage
const videoMatches = new Map<string, {
  peerId: string;
  roomName: string;
  createdAt: number;
}>();

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Queue cleanup interval (remove stale entries after 5 minutes)
const QUEUE_TTL = 5 * 60 * 1000;
const MATCH_TTL = 10 * 60 * 1000;

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean up old queue entries
  videoQueue.forEach((entry, odId) => {
    if (now - entry.joinedAt > QUEUE_TTL) {
      videoQueue.delete(odId);
    }
  });
  
  // Clean up old matches
  videoMatches.forEach((match, odId) => {
    if (now - match.createdAt > MATCH_TTL) {
      videoMatches.delete(odId);
    }
  });
}, 60000); // Run every minute

function checkRateLimit(odId: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(odId);
  
  if (userLimit) {
    if (now < userLimit.resetTime) {
      if (userLimit.count >= maxRequests) {
        return false;
      }
      userLimit.count++;
    } else {
      rateLimitStore.set(odId, { count: 1, resetTime: now + windowMs });
    }
  } else {
    rateLimitStore.set(odId, { count: 1, resetTime: now + windowMs });
  }
  
  return true;
}

// POST /api/video/random/queue - Enter random video chat queue
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  if (!checkRateLimit(userId, 10, 60000)) {
    return NextResponse.json({ 
      error: 'Rate limit exceeded. Please try again later.' 
    }, { status: 429 });
  }

  try {
    // Check if user already has a match
    const existingMatch = videoMatches.get(userId);
    if (existingMatch) {
      // Clean up and allow rejoining
      videoMatches.delete(userId);
      videoMatches.delete(existingMatch.peerId);
    }

    // Remove from queue if already there
    videoQueue.delete(userId);

    // Try to find a match from existing queue
    let matchedUserId: string | null = null;
    let matchedEntry: { userId: string; joinedAt: number } | null = null;

    for (const [queuedUserId, entry] of videoQueue.entries()) {
      if (queuedUserId !== userId) {
        // Found a match!
        matchedUserId = queuedUserId;
        matchedEntry = entry;
        break;
      }
    }

    if (matchedUserId && matchedEntry) {
      // Create match
      const roomName = `video-1v1-${nanoid(10)}`;
      
      // Remove matched user from queue
      videoQueue.delete(matchedUserId);

      // Store matches for both users
      videoMatches.set(userId, {
        peerId: matchedUserId,
        roomName,
        createdAt: Date.now(),
      });
      
      videoMatches.set(matchedUserId, {
        peerId: userId,
        roomName,
        createdAt: Date.now(),
      });

      console.log('[Video Random Queue] Match created:', {
        user1: userId,
        user2: matchedUserId,
        roomName,
      });

      return NextResponse.json({
        matched: true,
        roomName,
        peerId: matchedUserId,
      });
    }

    // No match found, add to queue
    videoQueue.set(userId, {
      userId,
      joinedAt: Date.now(),
    });

    console.log('[Video Random Queue] User added to queue:', userId, 'Queue size:', videoQueue.size);

    return NextResponse.json({
      matched: false,
      message: 'Added to queue. Waiting for a partner...',
      queuePosition: videoQueue.size,
    });

  } catch (error) {
    console.error('Error in video random queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/video/random/queue - Check for match
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  if (!checkRateLimit(userId, 30, 60000)) {
    return NextResponse.json({ 
      error: 'Rate limit exceeded. Please try again later.' 
    }, { status: 429 });
  }

  try {
    const match = videoMatches.get(userId);

    if (match) {
      return NextResponse.json({
        matched: true,
        roomName: match.roomName,
        peerId: match.peerId,
      });
    }

    // Check if still in queue
    const inQueue = videoQueue.has(userId);

    return NextResponse.json({ 
      matched: false,
      inQueue,
      queuePosition: inQueue ? Array.from(videoQueue.keys()).indexOf(userId) + 1 : 0,
    });

  } catch (error) {
    console.error('Error checking video queue status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/video/random/queue - Leave queue
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Remove from queue
    videoQueue.delete(userId);
    
    // Remove any existing match
    const match = videoMatches.get(userId);
    if (match) {
      videoMatches.delete(userId);
      videoMatches.delete(match.peerId);
    }

    console.log('[Video Random Queue] User left queue:', userId);

    return NextResponse.json({ 
      success: true,
      message: 'Left queue successfully' 
    });

  } catch (error) {
    console.error('Error leaving video queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
