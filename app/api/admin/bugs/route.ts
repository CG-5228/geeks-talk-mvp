import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { renderBugReplyEmail } from '@/lib/emailTemplates';
import { sendEmailWithFallback } from '@/lib/emailResend';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const skip = (page - 1) * limit;
  
  const [bugs, total] = await Promise.all([
    db.bugReport.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true
          }
        },
        replies: {
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    db.bugReport.count()
  ]);
  
  return NextResponse.json({
    bugs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  try {
    const { bugReportId, message, sendEmail } = await req.json();
    
    if (!bugReportId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Create the reply
    const reply = await db.bugReply.create({
      data: {
        bugReportId,
        message,
        sentToEmail: sendEmail || false,
        adminId: session.user.id
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Send email if requested
    if (sendEmail) {
      try {
        const bugReport = await db.bugReport.findUnique({
          where: { id: bugReportId },
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        });
        
        if (bugReport?.user?.email) {
          const emailHtml = renderBugReplyEmail({
            reporterName: bugReport.user.name || 'User',
            bugTitle: bugReport.title,
            adminName: reply.admin.name || 'Admin',
            replyMessage: message
          });
          
          await sendEmailWithFallback({
            to: bugReport.user.email,
            subject: `Re: Bug Report - ${bugReport.title}`,
            html: emailHtml
          });
        }
      } catch (emailError) {
        console.error('Failed to send bug reply email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error('Failed to create bug reply:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  try {
    const { bugId, status } = await req.json();
    
    if (!bugId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    
    const updatedBug = await db.bugReport.update({
      where: { id: bugId },
      data: { status }
    });
    
    return NextResponse.json({ success: true, bug: updatedBug });
  } catch (error) {
    console.error('Failed to update bug status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
