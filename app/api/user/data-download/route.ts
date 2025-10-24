import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/user/data-download - Download user's personal data
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch all user data
    const userData = await db.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true,
        messages: {
          include: {
            room: {
              select: { name: true, slug: true }
            }
          }
        },
        sentDMs: {
          include: {
            receiver: {
              select: { name: true, username: true, email: true }
            }
          }
        },
        receivedDMs: {
          include: {
            sender: {
              select: { name: true, username: true, email: true }
            }
          }
        },
        notifications: true,
        bugReports: true,
        contactMessages: true,
        tutorialVideos: true,
        ownedRooms: {
          select: { name: true, slug: true, createdAt: true }
        },
        followers: {
          include: {
            follower: {
              select: { name: true, username: true, email: true }
            }
          }
        },
        following: {
          include: {
            followee: {
              select: { name: true, username: true, email: true }
            }
          }
        },
        friendships: {
          include: {
            friend: {
              select: { name: true, username: true, email: true }
            }
          }
        },
        friendOf: {
          include: {
            user: {
              select: { name: true, username: true, email: true }
            }
          }
        }
      }
    });

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create a comprehensive data export
    const exportData = {
      personalInfo: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        username: userData.username,
        bio: userData.bio,
        image: userData.image,
        role: userData.role,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        lastSeen: userData.lastSeen,
        profileVisibility: userData.profileVisibility,
        showOnlineStatus: userData.showOnlineStatus,
        dmPermissions: userData.dmPermissions,
      },
      accountConnections: userData.accounts,
      messages: userData.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        roomName: msg.room?.name,
        roomSlug: msg.room?.slug,
        createdAt: msg.createdAt,
        moderationStatus: msg.moderationStatus,
        spamScore: msg.spamScore,
        unsent: msg.unsent,
      })),
      directMessages: {
        sent: userData.sentDMs.map(dm => ({
          id: dm.id,
          content: dm.content,
          receiver: dm.receiver,
          createdAt: dm.createdAt,
          read: dm.read,
        })),
        received: userData.receivedDMs.map(dm => ({
          id: dm.id,
          content: dm.content,
          sender: dm.sender,
          createdAt: dm.createdAt,
          read: dm.read,
        }))
      },
      notifications: userData.notifications,
      bugReports: userData.bugReports,
      contactMessages: userData.contactMessages,
      tutorialVideos: userData.tutorialVideos,
      ownedRooms: userData.ownedRooms,
      socialConnections: {
        followers: userData.followers.map(f => ({
          followerId: f.followerId,
          followeeId: f.followeeId,
          follower: f.follower,
          status: f.status,
          createdAt: f.createdAt,
        })),
        following: userData.following.map(f => ({
          followerId: f.followerId,
          followeeId: f.followeeId,
          followee: f.followee,
          status: f.status,
          createdAt: f.createdAt,
        })),
        friendships: userData.friendships.map(f => ({
          id: f.id,
          friend: f.friend,
          status: f.status,
          createdAt: f.createdAt,
        })),
        friendOf: userData.friendOf.map(f => ({
          id: f.id,
          user: f.user,
          status: f.status,
          createdAt: f.createdAt,
        }))
      },
      exportDate: new Date().toISOString(),
      exportVersion: '1.0'
    };

    // Return as JSON download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="geeks-talk-data-export-${userData.username || userData.id}-${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error('Error generating data export:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
