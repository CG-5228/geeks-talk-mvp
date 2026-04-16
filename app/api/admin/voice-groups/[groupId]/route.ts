import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const { groupId } = params;
    
    // Check if group exists
    const group = await db.voiceGroup.findUnique({
      where: { id: groupId }
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Voice group not found' }, { status: 404 });
    }

    // Delete all members first
    await db.voiceGroupMember.deleteMany({
      where: { groupId }
    });

    // Delete all files associated with the group
    await db.voiceGroupFile.deleteMany({
      where: { groupId }
    });

    // Delete the group
    await db.voiceGroup.delete({
      where: { id: groupId }
    });

    return NextResponse.json({ message: 'Voice group deleted successfully' });
  } catch (error) {
    console.error('Error deleting voice group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ groupId: string }> }) {
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
    const { name, description, maxMembers, isActive } = await req.json();
    
    // Check if group exists
    const existingGroup = await db.voiceGroup.findUnique({
      where: { id: groupId }
    });
    
    if (!existingGroup) {
      return NextResponse.json({ error: 'Voice group not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (maxMembers) updateData.maxMembers = maxMembers;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedGroup = await db.voiceGroup.update({
      where: { id: groupId },
      data: updateData,
      include: {
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error('Error updating voice group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
