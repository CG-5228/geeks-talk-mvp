import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { channelId } = params;
    
    // Check if channel exists
    const channel = await db.room.findUnique({
      where: { id: channelId }
    });
    
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Delete all messages in the channel first
    await db.message.deleteMany({
      where: { roomId: channelId }
    });

    // Delete the channel
    await db.room.delete({
      where: { id: channelId }
    });

    return NextResponse.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('Error deleting channel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { channelId } = params;
    const { name, topic, visibility, category } = await req.json();
    
    // Check if channel exists
    const existingChannel = await db.room.findUnique({
      where: { id: channelId }
    });
    
    if (!existingChannel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (topic !== undefined) updateData.topic = topic;
    if (visibility) updateData.visibility = visibility;
    if (category) updateData.category = category;

    const updatedChannel = await db.room.update({
      where: { id: channelId },
      data: updateData,
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

    return NextResponse.json(updatedChannel);
  } catch (error) {
    console.error('Error updating channel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
