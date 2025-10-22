import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateLiveKitToken } from '@/lib/livekit';

// In-memory queue for demo purposes
// In production, you'd use Redis or a proper queue system
const randomQueue = {
  '1v1': [] as string[],
  'group': [] as string[],
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type } = await request.json();
    
    if (!type || !['1v1', 'group'].includes(type)) {
      return NextResponse.json({ error: 'Invalid queue type' }, { status: 400 });
    }

    const userId = session.user.id;
    const queue = randomQueue[type as '1v1' | 'group'];

    // Check if user is already in queue
    if (queue.includes(userId)) {
      return NextResponse.json({ error: 'Already in queue' }, { status: 400 });
    }

    // Check if user is already in a voice group
    const existingGroup = await db.voiceGroupMember.findFirst({
      where: { userId },
    });

    if (existingGroup) {
      return NextResponse.json({ 
        error: 'You are already in a voice group. Please leave it first.' 
      }, { status: 400 });
    }

    // Add user to queue
    queue.push(userId);

    // Check for matches
    if (type === '1v1' && queue.length >= 2) {
      // Match two users for 1v1
      const [user1, user2] = queue.splice(0, 2);
      
      // Create or get a temporary channel for random chats
      let tempChannel = await db.room.findFirst({
        where: { name: 'Random Chat' }
      });
      
      if (!tempChannel) {
        tempChannel = await db.room.create({
          data: {
            name: 'Random Chat',
            slug: 'random-chat',
            topic: 'Temporary channel for random voice chats',
            visibility: 'public',
            category: 'Random',
          }
        });
      }

      // Create a temporary group for 1v1
      const tempGroup = await db.voiceGroup.create({
        data: {
          groupNumber: Math.floor(Math.random() * 1000) + 1,
          channelId: tempChannel.id,
          maxMembers: 2,
          isRandom: true,
          isTemp: true,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          members: {
            create: [
              { userId: user1, joinOrder: 1 },
              { userId: user2, joinOrder: 2 },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      // Generate LiveKit tokens for both users
      const roomName = `random-${tempGroup.id}`;
      const liveKitToken = await generateLiveKitToken({
        roomName,
        participantName: session.user.name || 'Anonymous',
        participantIdentity: session.user.id,
      });

      return NextResponse.json({
        matched: true,
        groupId: tempGroup.id,
        roomName,
        liveKitToken,
        members: tempGroup.members,
      });
    } else if (type === 'group' && queue.length >= 3) {
      // Match 3-4 users for group
      const groupSize = Math.min(4, queue.length);
      const matchedUsers = queue.splice(0, groupSize);
      
      // Create or get a temporary channel for random chats
      let tempChannel = await db.room.findFirst({
        where: { name: 'Random Chat' }
      });
      
      if (!tempChannel) {
        tempChannel = await db.room.create({
          data: {
            name: 'Random Chat',
            slug: 'random-chat',
            topic: 'Temporary channel for random voice chats',
            visibility: 'public',
            category: 'Random',
          }
        });
      }

      // Create a temporary group
      const tempGroup = await db.voiceGroup.create({
        data: {
          groupNumber: Math.floor(Math.random() * 1000) + 1,
          channelId: tempChannel.id,
          maxMembers: groupSize,
          isRandom: true,
          isTemp: true,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          members: {
            create: matchedUsers.map((userId, index) => ({
              userId,
              joinOrder: index + 1,
            })),
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      // Generate LiveKit token
      const roomName = `random-${tempGroup.id}`;
      const liveKitToken = await generateLiveKitToken({
        roomName,
        participantName: session.user.name || 'Anonymous',
        participantIdentity: session.user.id,
      });

      return NextResponse.json({
        matched: true,
        groupId: tempGroup.id,
        roomName,
        liveKitToken,
        members: tempGroup.members,
      });
    }

    // No match yet, user is in queue
    return NextResponse.json({
      matched: false,
      queuePosition: queue.length,
      estimatedWaitTime: type === '1v1' ? 30 : 60, // seconds
    });

  } catch (error) {
    console.error('Error joining random queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Remove user from all queues
    const removedFrom1v1 = randomQueue['1v1'].includes(userId);
    const removedFromGroup = randomQueue['group'].includes(userId);

    if (removedFrom1v1) {
      randomQueue['1v1'] = randomQueue['1v1'].filter(id => id !== userId);
    }

    if (removedFromGroup) {
      randomQueue['group'] = randomQueue['group'].filter(id => id !== userId);
    }

    return NextResponse.json({
      success: true,
      removedFrom1v1,
      removedFromGroup,
    });

  } catch (error) {
    console.error('Error leaving random queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const in1v1Queue = randomQueue['1v1'].includes(userId);
    const inGroupQueue = randomQueue['group'].includes(userId);

    return NextResponse.json({
      inQueue: in1v1Queue || inGroupQueue,
      queueType: in1v1Queue ? '1v1' : inGroupQueue ? 'group' : null,
      queuePosition: in1v1Queue 
        ? randomQueue['1v1'].indexOf(userId) + 1
        : inGroupQueue 
        ? randomQueue['group'].indexOf(userId) + 1
        : null,
      queueStats: {
        '1v1': randomQueue['1v1'].length,
        'group': randomQueue['group'].length,
      },
    });

  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
