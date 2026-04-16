import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId } = params;
    const { targetUserId, reason } = await request.json();

    if (!targetUserId || !reason) {
      return NextResponse.json({ error: 'Missing targetUserId or reason' }, { status: 400 });
    }

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

    // Check if target user is in the group
    const targetMembership = await db.voiceGroupMember.findFirst({
      where: {
        groupId,
        userId: targetUserId,
      },
    });

    if (!targetMembership) {
      return NextResponse.json({ error: 'Target user is not in this group' }, { status: 400 });
    }

    // Check if user is trying to vote kick themselves
    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: 'Cannot vote kick yourself' }, { status: 400 });
    }

    // Check if there's already an active vote kick poll for this user
    const existingPoll = await db.voteKickPoll.findFirst({
      where: {
        groupId,
        targetId: targetUserId,
        status: 'active',
      },
    });

    if (existingPoll) {
      return NextResponse.json({ error: 'There is already an active vote kick poll for this user' }, { status: 400 });
    }

    // Create vote kick poll
    const poll = await db.voteKickPoll.create({
      data: {
        groupId,
        targetId: targetUserId,
        reason,
        status: 'active',
        votesFor: [session.user.id], // User who initiated the vote
        votesAgainst: [],
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
      include: {
        target: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      poll,
      message: 'Vote kick poll created successfully',
    });

  } catch (error) {
    console.error('Error creating vote kick poll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // Get active vote kick polls for this group
    const polls = await db.voteKickPoll.findMany({
      where: {
        groupId,
        status: 'active',
      },
      include: {
        target: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ polls });

  } catch (error) {
    console.error('Error fetching vote kick polls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
