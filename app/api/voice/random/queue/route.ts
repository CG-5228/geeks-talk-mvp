import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { redisQueue } from '@/lib/redis';
import { nanoid } from 'nanoid';

// POST /api/voice/random/queue - Enter queue with topics
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { topics } = await request.json();
    
    if (!Array.isArray(topics)) {
      return NextResponse.json({ error: 'Topics must be an array' }, { status: 400 });
    }

    const userId = session.user.id;

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
        console.log(`Cleaning up expired match for user ${userId}`);
        await redisQueue.forceCleanupUser(userId);
      } else {
        // For now, always clean up existing matches to allow re-joining
        // This prevents users from getting stuck with stale match data
        console.log(`Cleaning up existing match for user ${userId} to allow re-joining`);
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
      console.log(`Found match for user ${userId} with ${bestMatch.userId}`);
      
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
        console.log(`Match created successfully: ${userId} <-> ${bestMatch.userId} in room ${roomName}`);
        return NextResponse.json({
          matched: true,
          roomName,
          peerId: bestMatch.userId,
          peerTopics: bestMatch.topics,
        });
      } else {
        console.log(`Failed to create match between ${userId} and ${bestMatch.userId}`);
      }
    } else {
      console.log(`No match found for user ${userId} with topics:`, topics);
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

  try {
    const userId = session.user.id;
    const match = await redisQueue.getMatch(userId);

    if (match) {
      console.log(`Match found for user ${userId}:`, match);
      return NextResponse.json({
        matched: true,
        roomName: match.roomName,
        peerId: match.peerId,
        peerTopics: match.peerTopics,
      });
    }

    console.log(`No match found for user ${userId}`);
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

  try {
    const userId = session.user.id;

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