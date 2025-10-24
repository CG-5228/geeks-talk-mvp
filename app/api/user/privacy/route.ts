import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/user/privacy - Get user privacy settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
      select: {
        id: true,
        profileVisibility: true,
        showOnlineStatus: true,
        dmPermissions: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      profileVisibility: user.profileVisibility,
      showOnlineStatus: user.showOnlineStatus,
      dmPermissions: user.dmPermissions,
    });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/user/privacy - Update user privacy settings
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { profileVisibility, showOnlineStatus, dmPermissions } = body;

    // Validate input
    if (profileVisibility && !['public', 'friends', 'private'].includes(profileVisibility)) {
      return NextResponse.json({ error: 'Invalid profile visibility' }, { status: 400 });
    }

    if (dmPermissions && !['everyone', 'friends', 'nobody'].includes(dmPermissions)) {
      return NextResponse.json({ error: 'Invalid DM permissions' }, { status: 400 });
    }

    if (typeof showOnlineStatus !== 'boolean' && showOnlineStatus !== undefined) {
      return NextResponse.json({ error: 'Invalid show online status' }, { status: 400 });
    }

    // Update user privacy settings
    const updatedUser = await db.user.update({
      where: { id: (session.user as any).id },
      data: {
        ...(profileVisibility && { profileVisibility }),
        ...(showOnlineStatus !== undefined && { showOnlineStatus }),
        ...(dmPermissions && { dmPermissions }),
      },
      select: {
        id: true,
        profileVisibility: true,
        showOnlineStatus: true,
        dmPermissions: true,
      }
    });

    return NextResponse.json({
      message: 'Privacy settings updated successfully',
      settings: {
        profileVisibility: updatedUser.profileVisibility,
        showOnlineStatus: updatedUser.showOnlineStatus,
        dmPermissions: updatedUser.dmPermissions,
      }
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
