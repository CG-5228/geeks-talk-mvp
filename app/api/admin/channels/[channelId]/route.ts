import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGate';
import { logAdminAction } from '@/lib/adminAudit';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const channel = await db.room.findUnique({
    where: { id: params.channelId },
    include: {
      _count: { select: { messages: true } },
      owner: {
        select: { id: true, name: true, username: true, email: true, image: true },
      },
    },
  });
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

  const memberCount = await db.user.count({
    where: { rooms: { some: { id: channel.id } } },
  });

  return NextResponse.json({
    channel: {
      id: channel.id,
      name: channel.name,
      slug: channel.slug,
      topic: channel.topic,
      visibility: channel.visibility,
      category: channel.category,
      archived: channel.archived,
      isVoice: channel.isVoice,
      isDM: channel.isDM,
      inviteCode: channel.inviteCode,
      ownerId: channel.ownerId,
      owner: channel.owner,
      createdAt: channel.createdAt.toISOString(),
      _count: { messages: channel._count.messages, members: memberCount },
    },
  });
}

export async function DELETE(req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    const { channelId } = params;
    const channel = await db.room.findUnique({ where: { id: channelId }, select: { id: true, name: true } });
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    await db.message.deleteMany({ where: { roomId: channelId } });
    await db.room.delete({ where: { id: channelId } });

    await logAdminAction({
      adminId: gate.userId,
      action: 'channel.delete',
      targetType: 'channel',
      targetId: channelId,
      summary: `Deleted channel ${channel.name}`,
      req,
    });

    return NextResponse.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('Error deleting channel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => null)) as { archived?: unknown } | null;
  if (!body || typeof body.archived !== 'boolean') {
    return NextResponse.json({ error: 'archived (boolean) is required' }, { status: 400 });
  }

  try {
    const channel = await db.room.update({
      where: { id: params.channelId },
      data: { archived: body.archived },
      select: { id: true, name: true, archived: true },
    });

    await logAdminAction({
      adminId: gate.userId,
      action: body.archived ? 'channel.archive' : 'channel.unarchive',
      targetType: 'channel',
      targetId: channel.id,
      summary: `${body.archived ? 'Archived' : 'Unarchived'} channel ${channel.name}`,
      req,
    });

    return NextResponse.json({ channel });
  } catch (error) {
    console.error('Error toggling channel archive:', error);
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ channelId: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

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
