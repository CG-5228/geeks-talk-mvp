import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string; pollId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId, pollId } = params;
    const { vote } = await request.json(); // 'kick' or 'keep'

    if (!vote || !['kick', 'keep'].includes(vote)) {
      return NextResponse.json({ error: 'Invalid vote. Must be "kick" or "keep"' }, { status: 400 });
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

    // Get the poll
    const poll = await db.voteKickPoll.findFirst({
      where: {
        id: pollId,
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
    });

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found or no longer active' }, { status: 404 });
    }

    // Check if user already voted
    const hasVotedFor = poll.votesFor.includes(session.user.id);
    const hasVotedAgainst = poll.votesAgainst.includes(session.user.id);

    if (hasVotedFor || hasVotedAgainst) {
      return NextResponse.json({ error: 'You have already voted on this poll' }, { status: 400 });
    }

    // Check if user is trying to vote on themselves
    if (poll.targetId === session.user.id) {
      return NextResponse.json({ error: 'Cannot vote on yourself' }, { status: 400 });
    }

    // Update the poll with the new vote
    const updatedPoll = await db.voteKickPoll.update({
      where: { id: pollId },
      data: {
        votesFor: vote === 'kick' 
          ? { push: session.user.id }
          : poll.votesFor,
        votesAgainst: vote === 'keep'
          ? { push: session.user.id }
          : poll.votesAgainst,
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

    // Check if we have enough votes to determine outcome
    const totalVotes = updatedPoll.votesFor.length + updatedPoll.votesAgainst.length;
    const kickVotes = updatedPoll.votesFor.length;
    const keepVotes = updatedPoll.votesAgainst.length;

    // Get total group members (excluding target)
    const groupMembers = await db.voiceGroupMember.findMany({
      where: {
        groupId,
        userId: { not: poll.targetId },
      },
    });

    const totalEligibleVoters = groupMembers.length;
    const requiredVotes = Math.max(3, Math.ceil(totalEligibleVoters * 0.5)); // Min 3 votes, or >50% of eligible voters

    let pollStatus = 'active';
    let actionTaken = null;

    if (totalVotes >= requiredVotes) {
      if (kickVotes > keepVotes) {
        // Kick the user
        pollStatus = 'passed';
        actionTaken = 'kicked';
        
        // Remove user from group
        await db.voiceGroupMember.deleteMany({
          where: {
            groupId,
            userId: poll.targetId,
          },
        });

        // Create a report entry
        await db.userReport.create({
          data: {
            reporterId: session.user.id,
            reportedId: poll.targetId,
            reason: poll.reason,
            category: 'inappropriate',
            description: 'Vote kick from voice group',
            groupId,
            status: 'resolved',
          },
        });
      } else {
        // Keep the user
        pollStatus = 'failed';
        actionTaken = 'kept';
      }

      // Update poll status
      await db.voteKickPoll.update({
        where: { id: pollId },
        data: { 
          status: pollStatus,
        },
      });
    }

    return NextResponse.json({
      success: true,
      poll: updatedPoll,
      pollStatus,
      actionTaken,
      voteCounts: {
        total: totalVotes,
        kick: kickVotes,
        keep: keepVotes,
        required: requiredVotes,
      },
    });

  } catch (error) {
    console.error('Error voting on kick poll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
