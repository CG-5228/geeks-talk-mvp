import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmailWithFallback } from '@/lib/emailResend';
import { renderUserReportEmail } from '@/lib/emailTemplates';
import { requireAdmin } from '@/lib/adminGate';

// POST /api/user/report - Create a user report
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, reason, category, description, groupId, channelId, attachments } = body;
    
    console.log('📝 Report submission:', {
      userId,
      reason,
      category,
      description,
      attachmentsCount: attachments?.length || 0,
      attachments: attachments
    });

    if (!userId || !reason || !category) {
      return NextResponse.json(
        { error: 'User ID, reason, and category are required' },
        { status: 400 }
      );
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    // Validate category
    const validCategories = ['harassment', 'spam', 'inappropriate', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Check if user exists
    const reportedUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!reportedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has already reported this user recently (rate-limit repeated reports)
    const cooldownMs = process.env.NODE_ENV === 'production' ? 24 * 60 * 60 * 1000 : 60 * 1000; // 24h prod, 60s dev
    const recentReport = await db.userReport.findFirst({
      where: {
        reporterId: session.user.id,
        reportedId: userId,
        createdAt: {
          gte: new Date(Date.now() - cooldownMs),
        },
      },
    });

    if (recentReport) {
      return NextResponse.json(
        { error: `You have already reported this user recently. Please wait ${process.env.NODE_ENV === 'production' ? '24 hours' : 'a minute'} before reporting again.` },
        { status: 429 }
      );
    }

    // Get reporter details for notifications
    const reporter = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true }
    });

    // Create the report first
    const report = await db.userReport.create({
      data: {
        reporterId: session.user.id,
        reportedId: userId,
        reason,
        category,
        description: description || null,
        groupId: groupId || null,
        channelId: channelId || null,
        status: 'pending'
      },
    }).catch((error) => {
      console.error('❌ Error creating report:', error);
      throw error;
    });

    // Normalize attachments. Only s3Key matters now — the admin UI re-signs
    // fresh URLs on demand, so we no longer persist a short-lived s3Url.
    let normalizedAttachments: Array<{ fileName: string; fileSize: number; fileType: string; s3Key: string; }> = [];
    if (attachments && attachments.length > 0) {
      try {
        // s3Key is client-supplied; only accept keys under the reporter's own
        // upload prefix (see report/upload route). Without this, an attacker can
        // point an attachment at ANY object in the bucket and have the admin
        // re-sign endpoint disclose it.
        const allowedPrefix = `report-attachments/${session.user.id}/`;
        normalizedAttachments = (attachments as any[])
          .map((att: any) => (att && att.file ? att.file : att))
          .map((att: any) => ({
            fileName: String(att?.fileName || att?.name || 'evidence'),
            fileSize: Number(att?.fileSize ?? att?.size ?? 0),
            fileType: String(att?.fileType || att?.type || 'application/octet-stream'),
            s3Key: String(att?.s3Key || att?.key || ''),
          }))
          .filter((a) => !!a.s3Key && a.s3Key.startsWith(allowedPrefix));
      } catch (e) {
        console.error('❌ Failed to normalize attachments:', e);
      }
    }

    // Create attachments if any
    if (normalizedAttachments.length > 0) {
      for (const a of normalizedAttachments) {
        try {
          await db.userReportAttachment.create({
            data: {
              reportId: report.id,
              fileName: a.fileName,
              fileSize: isNaN(a.fileSize) ? 0 : a.fileSize,
              fileType: a.fileType,
              s3Key: a.s3Key,
            }
          });
        } catch (e) {
          console.error('❌ Failed to save attachment:', a, e);
        }
      }
    }

    // Get all admin users (both super admin and those with AdminPermission)
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const adminPermissions = await db.adminPermission.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    // Get super admin user if exists
    const superAdmin = superAdminEmail ? await db.user.findUnique({
      where: { email: superAdminEmail },
      select: { id: true, name: true, email: true }
    }) : null;
    
    // Combine all admins
    const admins = [
      ...adminPermissions.map(ap => ap.user),
      ...(superAdmin ? [superAdmin] : [])
    ].filter((admin, index, self) => 
      index === self.findIndex(a => a.id === admin.id)
    );

    // Create notifications for ALL admins (avoid spam in email; email only to primary)
    const primaryAdmin = superAdmin || admins[0];
    try {
      await Promise.all(
        admins.map(async (adminUser) => {
          try {
            await db.notification.create({
              data: {
                userId: adminUser.id,
                type: 'user_report',
                title: 'New User Report',
                message: `${reporter?.name || 'Anonymous'} reported ${reportedUser.name} for ${category}`,
                metadata: {
                  reportId: report.id,
                  reporterId: session.user.id,
                  reportedId: userId,
                  category,
                  reason
                }
              }
            });
          } catch (err) {
            console.error('Failed to create admin notification for', adminUser.id, err);
          }
        })
      );
    } catch (error) {
      console.error('Failed to create admin notifications:', error);
      // continue
    }

    // Fetch the report with attachments for email. Email links point at
    // the admin re-sign endpoint so they stay valid indefinitely.
    const reportWithAttachments = await db.userReport.findUnique({
      where: { id: report.id },
      include: { attachments: true }
    });

    const attachmentsForEmail = reportWithAttachments?.attachments ?? [];

    // Send email notifications to ALL admins (deduped by email)
    if (admins && admins.length > 0) {
      const uniqueAdminsByEmail = admins.filter((admin, index, self) =>
        !!admin.email && index === self.findIndex(a => a.email === admin.email)
      );
      await Promise.allSettled(uniqueAdminsByEmail.map(async (adminUser) => {
        try {
          const emailContent = renderUserReportEmail({
            adminName: adminUser.name || 'Admin',
            reporterName: reporter?.name || 'Anonymous',
            reportedUserName: reportedUser.name || 'Unknown User',
            category,
            reason,
            description: description || 'No additional details provided',
            reportId: report.id,
            timestamp: new Date().toISOString(),
            attachments: attachmentsForEmail as any
          });

          await sendEmailWithFallback({
            to: adminUser.email!,
            subject: `New User Report - ${reportedUser.name} reported for ${category}`,
            html: emailContent
          });
        } catch (error) {
          console.error(`Failed to send email to admin ${adminUser.email}:`, error);
        }
      }));
    }

    // Create notification for the reporting user (only if they're not an admin)
    // Admins don't need "Report Submitted" notifications since they already get "New User Report" notifications
    const isReporterAdmin = admins.some(admin => admin.id === session.user.id);
    if (!isReporterAdmin) {
      try {
        await db.notification.create({
          data: {
            userId: session.user.id,
            type: 'report_submitted',
            title: 'Report Submitted',
            message: `Your report against ${reportedUser.name} has been submitted successfully. Our moderation team will review it.`,
            metadata: {
              reportId: report.id,
              reportedUserId: userId,
              category
            }
          }
        });
        console.log('✅ User notification created successfully');
      } catch (error) {
        console.error('Failed to create user notification:', error);
        // Don't throw error - continue with report submission even if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: 'Report submitted successfully. Our moderation team will review it.',
    });
  } catch (error) {
    console.error('Error creating user report:', error);
    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 }
    );
  }
}

// GET /api/user/report?userId=xxx - Get reports for a specific user (admin only)
export async function GET(req: NextRequest) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const reports = await db.userReport.findMany({
      where: { reportedId: userId },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        reported: {
          select: { id: true, name: true, email: true },
        },
        reviewer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}