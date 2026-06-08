import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial data
      const sendData = async () => {
        try {
          const now = new Date();
          const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          
          // Get comprehensive real-time stats
          const [
            onlineUsers,
            activeUsers,
            totalMessages,
            contactMessages,
            activeGroups,
            totalChannels,
            totalLikes,
            totalUsers
          ] = await Promise.all([
            // Current online users — must have the online flag AND a fresh
            // heartbeat. The flag alone gets stale when a client crashes or
            // force-closes without firing the offline beacon; the lastSeen
            // window makes the count self-heal between cleanup sweeps.
            db.user.count({
              where: {
                onlineStatus: 'online',
                lastSeen: { gte: new Date(Date.now() - 2 * 60 * 1000) },
              },
            }),
            
            // Active users (last 24 hours)
            db.user.count({
              where: {
                lastSeen: {
                  gte: dayStart
                }
              }
            }),
            
            // Messages sent today
            db.message.count({
              where: {
                createdAt: {
                  gte: dayStart
                }
              }
            }),
            
            // Contact messages today
            db.contactMessage.count({
              where: {
                createdAt: {
                  gte: dayStart
                }
              }
            }),
            
            // Active voice groups
            db.voiceGroup.count({
              where: {
                members: {
                  some: {}
                }
              }
            }),
            
            // Total channels/rooms
            db.room.count(),
            
            // Total likes for helpful calculation
            db.userLike.count(),
            
            // Total users for helpful calculation
            db.user.count()
          ]);
          
          // Calculate helpful percentage
          const helpfulPercentage = totalUsers > 0 
            ? Math.min(Math.round((totalLikes / totalUsers / 10) * 100), 100)
            : 0;
          
          // Calculate average streak (simplified for real-time)
          const usersWithRecentActivity = await db.user.count({
            where: {
              lastSeen: {
                gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              }
            }
          });
          const averageStreak = totalUsers > 0 
            ? Math.round((usersWithRecentActivity / totalUsers) * 7)
            : 0;
          
          const data = {
            onlineUsers,
            activeUsers,
            messagesSent: totalMessages,
            contactMessages,
            activeGroups,
            totalChannels,
            helpfulPercentage,
            averageStreak,
            feedbackStars: Math.round(helpfulPercentage / 20 * 5 * 10) / 10, // Convert to 5-star scale
            timestamp: new Date().toISOString()
          };
          
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Error sending real-time data:', error);
        }
      };
      
      // Send initial data
      sendData();
      
      // Set up interval to send updates every 5 seconds
      const interval = setInterval(sendData, 5000);
      
      // Set up cleanup interval to mark inactive users as offline every 2 minutes
      const cleanupInterval = setInterval(async () => {
        try {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          await db.user.updateMany({
            where: {
              onlineStatus: 'online',
              lastSeen: {
                lt: fiveMinutesAgo
              }
            },
            data: {
              onlineStatus: 'offline'
            }
          });
        } catch (error) {
          console.error('Failed to cleanup offline users:', error);
        }
      }, 2 * 60 * 1000); // Every 2 minutes
      
      // Clean up on close
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clearInterval(cleanupInterval);
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}
