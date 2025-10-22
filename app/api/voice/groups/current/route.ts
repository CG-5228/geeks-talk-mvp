import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find the current group the user is in
    const currentGroup = await db.voiceGroupMember.findFirst({
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

    if (!currentGroup) {
      return NextResponse.json({ 
        groupId: null,
        message: 'User is not in any group' 
      });
    }

    return NextResponse.json({
      groupId: currentGroup.group.id,
      groupNumber: currentGroup.group.groupNumber,
      channelId: currentGroup.group.channelId,
      channelName: currentGroup.group.channel.name,
      joinedAt: currentGroup.joinedAt,
    });

  } catch (error) {
    console.error('Error fetching current group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
