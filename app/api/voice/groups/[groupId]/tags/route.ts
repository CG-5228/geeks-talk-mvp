import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId } = params;

    // Get the group with tags
    const group = await db.voiceGroup.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        tags: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
          orderBy: {
            joinOrder: 'asc',
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member of the group
    const isMember = group.members.some(member => member.userId === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    return NextResponse.json({
      tags: group.tags || [],
      canEdit: canEditTags(group.members, session.user.id),
    });

  } catch (error) {
    console.error('Error fetching group tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId } = params;
    const { tags } = await request.json();

    if (!Array.isArray(tags) || tags.length > 3) {
      return NextResponse.json({ error: 'Tags must be an array with maximum 3 items' }, { status: 400 });
    }

    // Validate tags
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0 || tag.length > 20) {
        return NextResponse.json({ error: 'Each tag must be a non-empty string with maximum 20 characters' }, { status: 400 });
      }
    }

    // Get the group with members
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
              },
            },
          },
          orderBy: {
            joinOrder: 'asc',
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is a member of the group
    const isMember = group.members.some(member => member.userId === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
    }

    // Check if user can edit tags
    if (!canEditTags(group.members, session.user.id)) {
      return NextResponse.json({ error: 'You do not have permission to edit tags' }, { status: 403 });
    }

    // Update tags
    const updatedGroup = await db.voiceGroup.update({
      where: { id: groupId },
      data: {
        tags: tags.map(tag => tag.trim()),
      },
    });

    return NextResponse.json({
      tags: updatedGroup.tags,
      message: 'Tags updated successfully',
    });

  } catch (error) {
    console.error('Error updating group tags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to determine if a user can edit tags
function canEditTags(members: any[], userId: string): boolean {
  // Sort members by join order
  const sortedMembers = members.sort((a, b) => a.joinOrder - b.joinOrder);
  
  // Find the user's position
  const userIndex = sortedMembers.findIndex(member => member.userId === userId);
  
  if (userIndex === -1) return false;
  
  // The first member (index 0) can always edit tags
  // If the first member leaves, the second member (index 1) can edit, and so on
  // We need to find the highest priority member who is still in the group
  let highestPriorityIndex = 0;
  for (let i = 0; i < sortedMembers.length; i++) {
    if (sortedMembers[i].userId) { // User is still in the group
      highestPriorityIndex = i;
      break;
    }
  }
  
  return userIndex === highestPriorityIndex;
}
