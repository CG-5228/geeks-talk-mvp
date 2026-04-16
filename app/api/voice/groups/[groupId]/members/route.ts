import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId } = params;

    // Check if user is a member of this group
    const userMembership = await db.voiceGroupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id,
      },
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Fetch all members of the group
    const members = await db.voiceGroupMember.findMany({
      where: {
        groupId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            onlineStatus: true,
            lastSeen: true,
          },
        },
      },
      orderBy: {
        joinOrder: 'asc',
      },
    });

    return NextResponse.json({
      members,
      groupId,
      totalMembers: members.length,
    });

  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
