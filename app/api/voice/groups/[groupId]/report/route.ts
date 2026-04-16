import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadToS3 } from '@/lib/s3';

export async function POST(request: NextRequest, props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId } = params;
    const formData = await request.formData();
    const targetUserId = formData.get('targetUserId') as string;
    const reason = formData.get('reason') as string;
    const details = formData.get('details') as string;

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

    // Check if user is trying to report themselves
    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    // Check if user has already reported this user recently (prevent spam)
    const recentReport = await db.userReport.findFirst({
      where: {
        reporterId: session.user.id,
        reportedId: targetUserId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        },
      },
    });

    if (recentReport) {
      return NextResponse.json({ 
        error: 'You have already reported this user recently. Please wait 24 hours before reporting again.' 
      }, { status: 400 });
    }

    // Handle evidence files (store in description for now)
    let evidenceInfo = '';
    const evidenceFiles = [];
    
    for (let i = 0; i < 3; i++) {
      const file = formData.get(`evidence_${i}`) as File;
      if (file) {
        try {
          const fileBuffer = Buffer.from(await file.arrayBuffer());
          const uploadResult = await uploadToS3(
            fileBuffer, 
            file.name, 
            `reports/${groupId}/${session.user.id}`, 
            file.type
          );
          evidenceFiles.push({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            s3Key: uploadResult.key,
            url: uploadResult.url,
          });
        } catch (error) {
          console.error('Error uploading evidence file:', error);
        }
      }
    }

    // Add evidence info to description
    if (evidenceFiles.length > 0) {
      evidenceInfo = `\n\nEvidence files attached:\n${evidenceFiles.map(f => `- ${f.fileName} (${f.fileType})`).join('\n')}`;
    }

    // Create the report
    const report = await db.userReport.create({
      data: {
        reporterId: session.user.id,
        reportedId: targetUserId,
        reason,
        category: 'inappropriate',
        description: (details || '') + evidenceInfo,
        groupId,
        status: 'pending',
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        reported: {
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
      report,
      message: 'Report submitted successfully. It will be reviewed by administrators.',
    });

  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
