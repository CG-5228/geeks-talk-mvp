import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { table: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const table = params.table;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const skip = (page - 1) * limit;
  
  try {
    // Map table names to Prisma model names
    const modelMap: { [key: string]: any } = {
      'User': db.user,
      'Account': db.account,
      'Session': db.session,
      'VerificationToken': db.verificationToken,
      'Subject': db.subject,
      'Thread': db.thread,
      'Room': db.room,
      'Message': db.message,
      'VoiceEligibility': db.voiceEligibility,
      'Follow': db.follow,
      'DirectMessage': db.directMessage,
      'ContactMessage': db.contactMessage,
      'BugReport': db.bugReport,
      'EmailCode': db.emailCode,
      'VoiceGroup': db.voiceGroup,
      'VoiceGroupMember': db.voiceGroupMember,
      'VoiceGroupFile': db.voiceGroupFile,
      'VoiceWhiteboard': db.voiceWhiteboard,
      'VoteKickPoll': db.voteKickPoll,
      'UserReport': db.userReport,
      'RandomChatQueue': db.randomChatQueue,
      'AdminPermission': db.adminPermission,
      'UserBan': db.userBan,
      'UserLike': db.userLike,
      'Notification': db.notification,
      'AdminMessage': db.adminMessage,
      'ContactReply': db.contactReply,
      'BlogPost': db.blogPost,
      'BlogComment': db.blogComment,
      'TutorialVideo': db.tutorialVideo,
      'DailyStats': db.dailyStats,
      'UserActivity': db.userActivity
    };
    
    const model = modelMap[table];
    if (!model) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }
    
    // Try to get records with createdAt, fallback to id if createdAt doesn't exist
    let records, total;
    try {
      [records, total] = await Promise.all([
        model.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        model.count()
      ]);
    } catch (error) {
      // If createdAt doesn't exist, try with id
      [records, total] = await Promise.all([
        model.findMany({
          skip,
          take: limit,
          orderBy: { id: 'desc' }
        }),
        model.count()
      ]);
    }
    
    return NextResponse.json({
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { table: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // For security, we'll limit which tables can be modified
  const allowedTables = ['DailyStats', 'UserActivity'];
  const table = params.table;
  
  if (!allowedTables.includes(table)) {
    return NextResponse.json({ error: 'Table modification not allowed' }, { status: 403 });
  }
  
  const data = await req.json();
  
  try {
    const modelMap: { [key: string]: any } = {
      'DailyStats': db.dailyStats,
      'UserActivity': db.userActivity
    };
    
    const model = modelMap[table];
    if (!model) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }
    
    const record = await model.create({
      data
    });
    
    return NextResponse.json({ record });
  } catch (error) {
    console.error('Database create error:', error);
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { table: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // For security, we'll limit which tables can be modified
  const allowedTables = ['DailyStats', 'UserActivity'];
  const table = params.table;
  
  if (!allowedTables.includes(table)) {
    return NextResponse.json({ error: 'Table modification not allowed' }, { status: 403 });
  }
  
  const { id } = await req.json();
  
  if (!id) {
    return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
  }
  
  try {
    const modelMap: { [key: string]: any } = {
      'DailyStats': db.dailyStats,
      'UserActivity': db.userActivity
    };
    
    const model = modelMap[table];
    if (!model) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }
    
    await model.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Database delete error:', error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
