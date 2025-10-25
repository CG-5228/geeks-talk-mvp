import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { redisQueue } from '@/lib/redis';
import { nanoid } from 'nanoid';
import { z } from 'zod';

// Validation schemas
const QueueRequestSchema = z.object({
  topics: z.array(z.string().min(1).max(50)).max(10), // Max 10 topics, each 1-50 chars
});

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting helper
function checkRateLimit(userId: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (userLimit) {
    if (now < userLimit.resetTime) {
      if (userLimit.count >= maxRequests) {
        return false;
      }
      userLimit.count++;
    } else {
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
  
  return true;
}

// POST /api/voice/random/queue - Enter queue with topics
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limiting: 5 requests per minute per user
  if (!checkRateLimit(userId, 5, 60000)) {
    return NextResponse.json({ 
      error: 'Rate limit exceeded. Please try again later.' 
    }, { status: 429 });
  }

  try {
    const body = await request.json();
    
    // Validate request body with Zod
    const validationResult = QueueRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request format',
        details: validationResult.error.issues 
      }, { status: 400 });
    }

    const { topics } = validationResult.data;

    // Check if user is already in a voice group
    const existingGroup = await db.voiceGroupMember.findFirst({
      where: { userId },
    });

    if (existingGroup) {
      return NextResponse.json({ 
        error: 'You are already in a voice group. Please leave it first.' 
      }, { status: 400 });
    }

    // Check if user already has a match and clean up if expired
    const existingMatch = await redisQueue.getMatch(userId);
    if (existingMatch) {
      // Check if the match is still valid (not expired)
      const matchAge = Date.now() - existingMatch.ts;
      const maxMatchAge = 10 * 60 * 1000; // 10 minutes
      
      if (matchAge > maxMatchAge) {
        // Match is expired, clean it up
        await redisQueue.forceCleanupUser(userId);
      } else {
        // Clean up existing matches to allow re-joining
        await redisQueue.forceCleanupUser(userId);
      }
    }

    // Store user metadata
    const searchId = nanoid();
    await redisQueue.setUserMeta(userId, topics, searchId);

    // Add user to queue
    await redisQueue.enqueue(userId, topics);

    // Try to find a match immediately
    const bestMatch = await redisQueue.findBestMatch(userId, topics);
    
    if (bestMatch) {
      // Create match atomically
      const roomName = `1v1-${nanoid()}`;
      const matchCreated = await redisQueue.createMatch(
        userId, 
        bestMatch.userId, 
        roomName, 
        topics, 
        bestMatch.topics
      );

      if (matchCreated) {
        return NextResponse.json({
          matched: true,
          roomName,
          peerId: bestMatch.userId,
          peerTopics: bestMatch.topics,
        });
      }
    }

    // No immediate match found
    return NextResponse.json({ 
      matched: false, 
      searchId: userId,
      message: 'Added to queue. Waiting for a partner...' 
    });

  } catch (error) {
    console.error('Error in random queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/voice/random/queue/status - Poll for match
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limiting: 30 requests per minute per user for polling
  if (!checkRateLimit(userId, 30, 60000)) {
    return NextResponse.json({ 
      error: 'Rate limit exceeded. Please try again later.' 
    }, { status: 429 });
  }

  try {
    const match = await redisQueue.getMatch(userId);

    if (match) {
      return NextResponse.json({
        matched: true,
        roomName: match.roomName,
        peerId: match.peerId,
        peerTopics: match.peerTopics,
      });
    }

    return NextResponse.json({ matched: false });

  } catch (error) {
    console.error('Error checking queue status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/voice/random/queue - Leave queue
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limiting: 10 requests per minute per user
  if (!checkRateLimit(userId, 10, 60000)) {
    return NextResponse.json({ 
      error: 'Rate limit exceeded. Please try again later.' 
    }, { status: 429 });
  }

  try {
    // Remove user from queue and clean up data
    await redisQueue.dequeue(userId);
    await redisQueue.deleteUser(userId);

    return NextResponse.json({ 
      success: true,
      message: 'Left queue successfully' 
    });

  } catch (error) {
    console.error('Error leaving queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}