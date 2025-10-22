const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listUsers() {
  try {
    console.log('Fetching all users...\n');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            messages: true,
            reportsMade: true,
            reportsReceived: true,
            voiceGroupMembers: true,
            bugReports: true,
            contactMessages: true,
            threads: true,
            ownedRooms: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (users.length === 0) {
      console.log('No users found in the database.');
      return;
    }

    console.log(`Found ${users.length} users:\n`);
    console.log('ID'.padEnd(25) + 'Name'.padEnd(20) + 'Email'.padEnd(30) + 'Username'.padEnd(15) + 'Role'.padEnd(10) + 'Created'.padEnd(12) + 'Activity');
    console.log('-'.repeat(120));

    users.forEach(user => {
      const name = (user.name || 'N/A').substring(0, 19);
      const email = user.email.substring(0, 29);
      const username = (user.username || 'N/A').substring(0, 14);
      const role = user.role.substring(0, 9);
      const created = user.createdAt.toISOString().split('T')[0];
      
      const activity = [
        user._count.messages,
        user._count.reportsMade,
        user._count.reportsReceived,
        user._count.voiceGroupMembers,
        user._count.bugReports,
        user._count.contactMessages,
        user._count.threads,
        user._count.ownedRooms
      ].join('/');

      console.log(
        user.id.padEnd(25) +
        name.padEnd(20) +
        email.padEnd(30) +
        username.padEnd(15) +
        role.padEnd(10) +
        created.padEnd(12) +
        activity
      );
    });

    console.log('\nActivity counts: Messages/ReportsMade/ReportsReceived/VoiceGroups/BugReports/Contacts/Threads/OwnedRooms');

  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
