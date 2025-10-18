import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Get groups for the channel with member counts and details
    const groups = await db.voiceGroup.findMany({
      where: {
        channelId,
        isTemp: false,
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
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        groupNumber: 'asc',
      },
    });

    // Format the response
    const formattedGroups = groups.map(group => ({
      id: group.id,
      groupNumber: group.groupNumber,
      tags: group.tags,
      maxMembers: group.maxMembers,
      memberCount: group._count.members,
      members: group.members.map(member => ({
        id: member.id,
        userId: member.userId,
        joinOrder: member.joinOrder,
        isSpeaking: member.isSpeaking,
        pushToTalk: member.pushToTalk,
        joinedAt: member.joinedAt,
        user: member.user,
      })),
      createdAt: group.createdAt,
    }));

    return NextResponse.json({ groups: formattedGroups });
  } catch (error) {
    console.error('Error fetching voice groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { channelId, isTemp = false, expiresAt } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Verify channel exists
    const channel = await db.room.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // For temp groups, create immediately
    if (isTemp) {
      const tempGroup = await db.voiceGroup.create({
        data: {
          channelId,
          groupNumber: 999, // Special number for temp groups
          tags: [],
          isTemp: true,
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 60 * 1000), // 30 min default
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

      return NextResponse.json({ group: tempGroup });
    }

    // For regular groups, check if we need to create new ones
    const existingGroups = await db.voiceGroup.findMany({
      where: {
        channelId,
        isTemp: false,
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    // Check if all groups have 6+ members
    const allGroupsFull = existingGroups.every(group => group._count.members >= 6);

    if (!allGroupsFull) {
      return NextResponse.json({ error: 'No need to create new group yet' }, { status: 400 });
    }

    // Find the next group number
    const maxGroupNumber = Math.max(...existingGroups.map(g => g.groupNumber), 0);
    const nextGroupNumber = maxGroupNumber + 1;

    const newGroup = await db.voiceGroup.create({
      data: {
        channelId,
        groupNumber: nextGroupNumber,
        tags: [],
        isTemp: false,
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

    return NextResponse.json({ group: newGroup });
  } catch (error) {
    console.error('Error creating voice group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
