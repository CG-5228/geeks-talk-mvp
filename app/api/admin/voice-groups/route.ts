import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  try {
    const groups = await db.voiceGroup.findMany({
      include: {
        _count: {
          select: {
            members: true
          }
        },
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            visibility: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error fetching voice groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
    const { channelId, groupNumber, tags, maxMembers, isTemp, isRandom } = await req.json();
    
    if (!channelId || !groupNumber) {
      return NextResponse.json({ error: 'Channel ID and group number are required' }, { status: 400 });
    }

    // Check if channel exists
    const channel = await db.room.findUnique({
      where: { id: channelId }
    });
    
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if group number already exists for this channel
    const existingGroup = await db.voiceGroup.findUnique({
      where: {
        channelId_groupNumber: {
          channelId,
          groupNumber
        }
      }
    });
    
    if (existingGroup) {
      return NextResponse.json({ error: 'Group number already exists for this channel' }, { status: 400 });
    }

    const group = await db.voiceGroup.create({
      data: {
        channelId,
        groupNumber,
        tags: tags || [],
        maxMembers: maxMembers || 8,
        isTemp: isTemp || false,
        isRandom: isRandom || false,
        expiresAt: isTemp ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null // 24 hours for temp groups
      },
      include: {
        _count: {
          select: {
            members: true
          }
        },
        channel: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating voice group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
