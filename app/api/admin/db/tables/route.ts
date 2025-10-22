import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // List of all Prisma models/tables
  const tables = [
    { name: 'User', displayName: 'Users' },
    { name: 'Account', displayName: 'Accounts' },
    { name: 'Session', displayName: 'Sessions' },
    { name: 'VerificationToken', displayName: 'Verification Tokens' },
    { name: 'Subject', displayName: 'Subjects' },
    { name: 'Thread', displayName: 'Threads' },
    { name: 'Room', displayName: 'Rooms' },
    { name: 'Message', displayName: 'Messages' },
    { name: 'VoiceEligibility', displayName: 'Voice Eligibility' },
    { name: 'Follow', displayName: 'Follows' },
    { name: 'DirectMessage', displayName: 'Direct Messages' },
    { name: 'ContactMessage', displayName: 'Contact Messages' },
    { name: 'BugReport', displayName: 'Bug Reports' },
    { name: 'EmailCode', displayName: 'Email Codes' },
    { name: 'VoiceGroup', displayName: 'Voice Groups' },
    { name: 'VoiceGroupMember', displayName: 'Voice Group Members' },
    { name: 'VoiceGroupFile', displayName: 'Voice Group Files' },
    { name: 'VoiceWhiteboard', displayName: 'Voice Whiteboards' },
    { name: 'VoteKickPoll', displayName: 'Vote Kick Polls' },
    { name: 'UserReport', displayName: 'User Reports' },
    { name: 'RandomChatQueue', displayName: 'Random Chat Queue' },
    { name: 'AdminPermission', displayName: 'Admin Permissions' },
    { name: 'UserBan', displayName: 'User Bans' },
    { name: 'UserLike', displayName: 'User Likes' },
    { name: 'Notification', displayName: 'Notifications' },
    { name: 'AdminMessage', displayName: 'Admin Messages' },
    { name: 'ContactReply', displayName: 'Contact Replies' },
    { name: 'BlogPost', displayName: 'Blog Posts' },
    { name: 'BlogComment', displayName: 'Blog Comments' },
    { name: 'TutorialVideo', displayName: 'Tutorial Videos' },
    { name: 'DailyStats', displayName: 'Daily Stats' },
    { name: 'UserActivity', displayName: 'User Activity' }
  ];
  
  return NextResponse.json({ tables });
}
