const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteUser(userId) {
  try {
    console.log(`Starting deletion process for user: ${userId}`);

    // First, let's check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        reportsMade: true,
        reportsReceived: true,
        reportsReviewed: true,
        voiceGroupMembers: true,
        voiceFiles: true,
        voteKickPolls: true,
        randomChatQueue: true,
        emailCodes: true,
        bugReports: true,
        contactMessages: true,
        messages: true,
        ownedRooms: true,
        threads: true,
        voiceEligibility: true,
        accounts: true,
        sessions: true,
        followers: true,
        following: true,
        receivedDMs: true,
        sentDMs: true,
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log(`Found user: ${user.name || user.email}`);

    // Delete in order to respect foreign key constraints
    console.log('Deleting related records...');

    // 1. Delete UserReports where user is the reporter, reported, or reviewer
    const deletedReports = await prisma.userReport.deleteMany({
      where: {
        OR: [
          { reporterId: userId },
          { reportedId: userId },
          { reviewedBy: userId }
        ]
      }
    });
    console.log(`Deleted ${deletedReports.count} user reports`);

    // 2. Delete VoteKickPolls where user is the target
    const deletedPolls = await prisma.voteKickPoll.deleteMany({
      where: { targetId: userId }
    });
    console.log(`Deleted ${deletedPolls.count} vote kick polls`);

    // 3. Delete VoiceGroupFiles uploaded by user
    const deletedFiles = await prisma.voiceGroupFile.deleteMany({
      where: { uploaderId: userId }
    });
    console.log(`Deleted ${deletedFiles.count} voice group files`);

    // 4. Delete VoiceGroupMembers
    const deletedMembers = await prisma.voiceGroupMember.deleteMany({
      where: { userId: userId }
    });
    console.log(`Deleted ${deletedMembers.count} voice group memberships`);

    // 5. Delete RandomChatQueue
    const deletedQueue = await prisma.randomChatQueue.deleteMany({
      where: { userId: userId }
    });
    console.log(`Deleted ${deletedQueue.count} random chat queue entries`);

    // 6. Delete EmailCodes
    const deletedCodes = await prisma.emailCode.deleteMany({
      where: { userId: userId }
    });
    console.log(`Deleted ${deletedCodes.count} email codes`);

    // 7. Delete BugReports
    const deletedBugs = await prisma.bugReport.deleteMany({
      where: { userId: userId }
    });
    console.log(`Deleted ${deletedBugs.count} bug reports`);

    // 8. Delete ContactMessages
    const deletedContacts = await prisma.contactMessage.deleteMany({
      where: { userId: userId }
    });
    console.log(`Deleted ${deletedContacts.count} contact messages`);

    // 9. Delete Messages
    const deletedMessages = await prisma.message.deleteMany({
      where: { authorId: userId }
    });
    console.log(`Deleted ${deletedMessages.count} messages`);

    // 10. Delete Threads
    const deletedThreads = await prisma.thread.deleteMany({
      where: { authorId: userId }
    });
    console.log(`Deleted ${deletedThreads.count} threads`);

    // 11. Delete VoiceEligibility
    const deletedEligibility = await prisma.voiceEligibility.deleteMany({
      where: { userId: userId }
    });
    console.log(`Deleted ${deletedEligibility.count} voice eligibility records`);

    // 12. Delete Follows (both directions)
    const deletedFollows = await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: userId },
          { followeeId: userId }
        ]
      }
    });
    console.log(`Deleted ${deletedFollows.count} follow relationships`);

    // 13. Delete DirectMessages
    const deletedDMs = await prisma.directMessage.deleteMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }
    });
    console.log(`Deleted ${deletedDMs.count} direct messages`);

    // 14. Delete Accounts (these have onDelete: Cascade, but let's be explicit)
    const deletedAccounts = await prisma.account.deleteMany({
      where: { userId: userId }
    });
    console.log(`Deleted ${deletedAccounts.count} accounts`);

    // 15. Delete Sessions (these have onDelete: Cascade, but let's be explicit)
    const deletedSessions = await prisma.session.deleteMany({
      where: { userId: userId }
    });
    console.log(`Deleted ${deletedSessions.count} sessions`);

    // 16. Handle owned rooms - we need to either delete them or transfer ownership
    const ownedRooms = await prisma.room.findMany({
      where: { ownerId: userId }
    });
    
    if (ownedRooms.length > 0) {
      console.log(`Found ${ownedRooms.length} owned rooms. Setting owner to null...`);
      await prisma.room.updateMany({
        where: { ownerId: userId },
        data: { ownerId: null }
      });
    }

    // 17. Remove user from room participants
    const roomsWithUser = await prisma.room.findMany({
      where: {
        participants: {
          has: userId
        }
      }
    });

    for (const room of roomsWithUser) {
      const updatedParticipants = room.participants.filter(id => id !== userId);
      await prisma.room.update({
        where: { id: room.id },
        data: { participants: updatedParticipants }
      });
    }
    console.log(`Removed user from ${roomsWithUser.length} room participants`);

    // Finally, delete the user
    console.log('Deleting user...');
    const deletedUser = await prisma.user.delete({
      where: { id: userId }
    });

    console.log(`✅ Successfully deleted user: ${deletedUser.name || deletedUser.email}`);
    console.log('User deletion completed successfully!');

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get user ID from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('Please provide a user ID as an argument');
  console.error('Usage: node scripts/delete-user.js <userId>');
  process.exit(1);
}

deleteUser(userId)
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
