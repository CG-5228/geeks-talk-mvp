import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all groups the user is currently in
    const userMemberships = await db.voiceGroupMember.findMany({
      where: {
        userId: session.user.id,
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

    if (userMemberships.length === 0) {
      return NextResponse.json({ 
        message: 'No groups to leave',
        leftGroups: []
      });
    }

    // Leave all groups
    const leftGroups = [];
    for (const membership of userMemberships) {
      // Remove the user from the group
      await db.voiceGroupMember.delete({
        where: {
          id: membership.id,
        },
      });

      // Update join orders for remaining members
      const remainingMembers = await db.voiceGroupMember.findMany({
        where: {
          groupId: membership.groupId,
        },
        orderBy: {
          joinedAt: 'asc',
        },
      });

      // Reassign join orders
      for (let i = 0; i < remainingMembers.length; i++) {
        await db.voiceGroupMember.update({
          where: {
            id: remainingMembers[i].id,
          },
          data: {
            joinOrder: i,
          },
        });
      }

      leftGroups.push({
        groupId: membership.groupId,
        groupNumber: membership.group.groupNumber,
        channelName: membership.group.channel.name,
        channelId: membership.group.channelId,
      });
    }

    return NextResponse.json({
      message: `Successfully left ${leftGroups.length} group(s)`,
      leftGroups,
    });
  } catch (error) {
    console.error('Error cleaning up user groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
