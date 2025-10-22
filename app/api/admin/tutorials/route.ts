import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadToS3, deleteFromS3 } from '@/lib/s3';

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
  const limit = parseInt(searchParams.get('limit') || '20');
  const published = searchParams.get('published');
  
  const skip = (page - 1) * limit;
  
  const where = published !== null ? { published: published === 'true' } : {};
  
  const [videos, total] = await Promise.all([
    db.tutorialVideo.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    db.tutorialVideo.count({ where })
  ]);
  
  return NextResponse.json({
    videos,
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
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const videoUrl = formData.get('videoUrl') as string;
    const published = formData.get('published') === 'true';
    const file = formData.get('file') as File | null;
    
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    let s3Key: string | null = null;
    let s3Url: string | null = null;
    
    // Handle file upload to S3
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name;
      
      const uploadResult = await uploadToS3(buffer, fileName, 'tutorials', file.type);
      s3Key = uploadResult.key;
      s3Url = uploadResult.url;
    }
    
    const video = await db.tutorialVideo.create({
      data: {
        title,
        description,
        videoUrl: videoUrl || null,
        s3Key,
        s3Url,
        published,
        publishedAt: published ? new Date() : null,
        uploadedBy: session.user.id
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true
          }
        }
      }
    });
    
    return NextResponse.json({ video });
  } catch (error) {
    console.error('Error creating tutorial video:', error);
    return NextResponse.json({ error: 'Failed to create tutorial video' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { id, title, description, videoUrl, published } = await req.json();
  
  if (!id) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }
  
  const updateData: any = {};
  if (title) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
  if (published !== undefined) {
    updateData.published = published;
    updateData.publishedAt = published ? new Date() : null;
  }
  
  const video = await db.tutorialVideo.update({
    where: { id },
    data: updateData,
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true
        }
      }
    }
  });
  
  return NextResponse.json({ video });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const { id } = await req.json();
  
  if (!id) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }
  
  // Get video to check for S3 file
  const video = await db.tutorialVideo.findUnique({
    where: { id }
  });
  
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }
  
  // Delete from S3 if exists
  if (video.s3Key) {
    try {
      await deleteFromS3(video.s3Key);
    } catch (error) {
      console.error('Failed to delete video from S3:', error);
      // Continue with database deletion even if S3 deletion fails
    }
  }
  
  // Delete from database
  await db.tutorialVideo.delete({
    where: { id }
  });
  
  return NextResponse.json({ message: 'Video deleted successfully' });
}
