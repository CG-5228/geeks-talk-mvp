import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Verify channel exists
    const channel = await db.room.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if groups already exist for this channel
    const existingGroups = await db.voiceGroup.findMany({
      where: {
        channelId,
        isTemp: false,
      },
    });

    if (existingGroups.length > 0) {
      return NextResponse.json({ 
        message: 'Groups already exist for this channel',
        groups: existingGroups 
      });
    }

    // Create 4 default groups
    console.log('🌱 Creating 4 default groups for channel:', channelId);
    const groups = await Promise.all(
      Array.from({ length: 4 }, (_, index) => {
        console.log(`🌱 Creating group ${index + 1} for channel ${channelId}`);
        return db.voiceGroup.create({
          data: {
            channelId,
            groupNumber: index + 1,
            tags: [],
            maxMembers: 8,
            isTemp: false,
          },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                  },
                },
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        });
      })
    );
    console.log('🌱 Successfully created groups:', groups.length);

    return NextResponse.json({ 
      message: 'Default groups created successfully',
      groups 
    });
  } catch (error) {
    console.error('Error seeding voice groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
