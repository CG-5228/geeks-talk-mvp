import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request, props: { params: Promise<{ groupId: string }> }) {
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
    const { groupId } = params;
    
    // Check if group exists
    const group = await db.voiceGroup.findUnique({
      where: { id: groupId }
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Voice group not found' }, { status: 404 });
    }

    // Get all members of this voice group
    const members = await db.voiceGroupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            onlineStatus: true,
            lastSeen: true
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    });

    const formattedMembers = members.map(member => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      onlineStatus: member.user.onlineStatus,
      joinedAt: member.joinedAt.toISOString()
    }));

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error('Error fetching voice group members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ groupId: string }> }) {
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
    const url = new URL(req.url);
    const memberId = url.searchParams.get('memberId');
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    // Remove member from the voice group
    await db.voiceGroupMember.deleteMany({
      where: { groupId: params.groupId, userId: memberId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing voice group member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
