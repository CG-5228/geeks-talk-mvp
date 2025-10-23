import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// DELETE /api/user/delete-account - Delete user account and all associated data
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { confirmDeletion } = body;

    if (!confirmDeletion) {
      return NextResponse.json({ error: 'Deletion confirmation required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Use a transaction to ensure all data is deleted atomically
    await db.$transaction(async (tx) => {
      // Delete all user-related data in the correct order (respecting foreign key constraints)
      
      // Delete user reactions
      await tx.messageReaction.deleteMany({
        where: { userId }
      });

      // Delete user notifications
      await tx.notification.deleteMany({
        where: { userId }
      });

      // Delete user messages
      await tx.message.deleteMany({
        where: { authorId: userId }
      });

      // Delete direct messages (both sent and received)
      await tx.directMessage.deleteMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      });

      // Delete user from voice groups
      await tx.voiceGroupMember.deleteMany({
        where: { userId }
      });

      // Delete user's voice group files
      await tx.voiceGroupFile.deleteMany({
        where: { uploaderId: userId }
      });

      // Delete user's voice whiteboards
      await tx.voiceWhiteboard.deleteMany({
        where: {
          group: {
            members: {
              some: { userId }
            }
          }
        }
      });

      // Delete user's vote kick polls
      await tx.voteKickPoll.deleteMany({
        where: { targetId: userId }
      });

      // Delete user's random chat queue
      await tx.randomChatQueue.deleteMany({
        where: { userId }
      });

      // Delete user's bug reports
      await tx.bugReport.deleteMany({
        where: { userId }
      });

      // Delete user's contact messages
      await tx.contactMessage.deleteMany({
        where: { userId }
      });

      // Delete user's tutorial videos
      await tx.tutorialVideo.deleteMany({
        where: { uploadedBy: userId }
      });

      // Delete user's blog posts and comments
      await tx.blogComment.deleteMany({
        where: { authorId: userId }
      });

      await tx.blogPost.deleteMany({
        where: { authorId: userId }
      });

      // Delete user's rooms (if they own any)
      await tx.room.deleteMany({
        where: { ownerId: userId }
      });

      // Delete user's threads
      await tx.thread.deleteMany({
        where: { authorId: userId }
      });

      // Delete user's email codes
      await tx.emailCode.deleteMany({
        where: { userId }
      });

      // Delete user's sessions
      await tx.session.deleteMany({
        where: { userId }
      });

      // Delete user's accounts (OAuth connections)
      await tx.account.deleteMany({
        where: { userId }
      });

      // Delete user's follow relationships
      await tx.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId },
            { followeeId: userId }
          ]
        }
      });

      // Delete user's friendships
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { userId },
            { friendId: userId }
          ]
        }
      });

      // Delete user's likes
      await tx.userLike.deleteMany({
        where: {
          OR: [
            { userId },
            { likedBy: userId }
          ]
        }
      });

      // Delete user's admin permissions (if any)
      await tx.adminPermission.deleteMany({
        where: {
          OR: [
            { userId },
            { grantedBy: userId }
          ]
        }
      });

      // Delete user's admin messages
      await tx.adminMessage.deleteMany({
        where: {
          OR: [
            { senderId: userId },
            { recipientId: userId }
          ]
        }
      });

      // Delete user's user reports
      await tx.userReport.deleteMany({
        where: {
          OR: [
            { reporterId: userId },
            { reportedId: userId }
          ]
        }
      });

      // Finally, delete the user
      await tx.user.delete({
        where: { id: userId }
      });
    });

    return NextResponse.json({
      message: 'Account and all associated data have been permanently deleted',
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
