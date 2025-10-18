import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

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
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is in the group
    const member = group.members.find(m => m.userId === session.user.id);
    if (!member) {
      return NextResponse.json({ error: 'Not in this group' }, { status: 400 });
    }

    // Remove user from the group
    await db.voiceGroupMember.delete({
      where: {
        id: member.id,
      },
    });

    // Get remaining members
    const remainingMembers = await db.voiceGroupMember.findMany({
      where: { groupId },
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
      orderBy: {
        joinOrder: 'asc',
      },
    });

    // Reassign join orders if needed
    if (remainingMembers.length > 0) {
      const updates = remainingMembers.map((member, index) => 
        db.voiceGroupMember.update({
          where: { id: member.id },
          data: { joinOrder: index },
        })
      );
      await Promise.all(updates);
    }

    // If group is empty and it's a temp group, schedule for deletion
    if (remainingMembers.length === 0 && group.isTemp) {
      // For temp groups, we'll let the cleanup cron handle deletion
      // or delete immediately if you prefer
      await db.voiceGroup.delete({
        where: { id: groupId },
      });
    }

    return NextResponse.json({
      success: true,
      remainingMembers: remainingMembers.map(m => ({
        id: m.id,
        userId: m.userId,
        joinOrder: m.joinOrder,
        isSpeaking: m.isSpeaking,
        pushToTalk: m.pushToTalk,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    });
  } catch (error) {
    console.error('Error leaving voice group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
