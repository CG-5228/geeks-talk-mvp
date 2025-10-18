import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateLiveKitToken, generateVoiceRoomName } from '@/lib/livekit';

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId } = params;

    // Get the group with current members
    const group = await db.voiceGroup.findUnique({
      where: { id: groupId },
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
        channel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is already in the group
    const existingMember = group.members.find(member => member.userId === session.user.id);
    if (existingMember) {
      // User is already in the group, return success with existing member data
      const roomName = generateVoiceRoomName(group.channelId, groupId);
      const token = await generateLiveKitToken({
        roomName,
        participantName: session.user.name || 'Anonymous',
        participantIdentity: session.user.id,
        metadata: JSON.stringify({
          userId: session.user.id,
          groupId,
          channelId: group.channelId,
        }),
      });

      return NextResponse.json({
        success: true,
        member: existingMember,
        group: group,
        liveKitToken: token,
        roomName,
        alreadyJoined: true,
      });
    }

    // Check if user is already in another group
    const userInOtherGroup = await db.voiceGroupMember.findFirst({
      where: {
        userId: session.user.id,
        group: {
          id: { not: groupId },
        },
      },
      include: {
        group: {
          include: {
            channel: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (userInOtherGroup) {
      return NextResponse.json({ 
        error: `You are already in Group ${userInOtherGroup.group.groupNumber} in ${userInOtherGroup.group.channel.name}. Please leave that group first.`,
        currentGroup: {
          id: userInOtherGroup.group.id,
          groupNumber: userInOtherGroup.group.groupNumber,
          channelName: userInOtherGroup.group.channel.name,
        }
      }, { status: 400 });
    }

    // Check if group is full
    if (group.members.length >= group.maxMembers) {
      return NextResponse.json({ error: 'Group is full' }, { status: 400 });
    }

    // Check if group is expired (for temp groups)
    if (group.isTemp && group.expiresAt && group.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Group has expired' }, { status: 400 });
    }

    // Get the next join order
    const maxJoinOrder = Math.max(...group.members.map(m => m.joinOrder), -1);
    const nextJoinOrder = maxJoinOrder + 1;

    // Add user to the group
    const newMember = await db.voiceGroupMember.create({
      data: {
        groupId,
        userId: session.user.id,
        joinOrder: nextJoinOrder,
      },
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
    });

    // Generate LiveKit token
    const roomName = generateVoiceRoomName(group.channelId, groupId);
    const token = await generateLiveKitToken({
      roomName,
      participantName: session.user.name || 'Anonymous',
      participantIdentity: session.user.id,
      metadata: JSON.stringify({
        userId: session.user.id,
        groupId,
        channelId: group.channelId,
      }),
    });

    // Get updated group with all members
    const updatedGroup = await db.voiceGroup.findUnique({
      where: { id: groupId },
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
        channel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      member: newMember,
      group: updatedGroup,
      liveKitToken: token,
      roomName,
    });
  } catch (error) {
    console.error('Error joining voice group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
