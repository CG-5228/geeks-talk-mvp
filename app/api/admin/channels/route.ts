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
    const channels = await db.room.findMany({
      include: {
        _count: {
          select: {
            messages: true
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get member counts for each channel
    const channelsWithMembers = await Promise.all(
      channels.map(async (channel) => {
        const memberCount = await db.user.count({
          where: {
            rooms: {
              some: {
                id: channel.id
              }
            }
          }
        });

        return {
          id: channel.id,
          name: channel.name,
          slug: channel.slug,
          topic: channel.topic,
          visibility: channel.visibility,
          category: channel.category,
          archived: channel.archived,
          ownerId: channel.ownerId,
          inviteCode: channel.inviteCode,
          createdAt: channel.createdAt.toISOString(),
          _count: {
            messages: channel._count.messages,
            members: memberCount
          },
          owner: channel.owner
        };
      })
    );

    return NextResponse.json({ channels: channelsWithMembers });
  } catch (error) {
    console.error('Error fetching channels:', error);
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
    const { name, topic, visibility, category } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Check if slug already exists
    const existingChannel = await db.room.findUnique({
      where: { slug }
    });
    
    if (existingChannel) {
      return NextResponse.json({ error: 'Channel with this name already exists' }, { status: 400 });
    }

    const channel = await db.room.create({
      data: {
        name,
        slug,
        topic,
        visibility: visibility || 'public',
        category: category || 'General',
        ownerId: session.user.id
      },
      include: {
        _count: {
          select: {
            messages: true
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
