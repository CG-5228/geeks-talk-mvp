import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || session.user.id;

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial data
      const sendData = async () => {
        try {
          const now = new Date();
          const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          
          // Get real-time user stats
          const [
            totalMessages,
            messagesToday,
            totalChannels,
            totalLikes,
            userActivity,
            user
          ] = await Promise.all([
            // Total messages sent by user
            db.message.count({
              where: { authorId: userId }
            }),
            
            // Messages sent today
            db.message.count({
              where: {
                authorId: userId,
                createdAt: {
                  gte: dayStart
                }
              }
            }),
            
            // Total channels/rooms user has participated in
            db.room.count({
              where: {
                messages: {
                  some: {
                    authorId: userId
                  }
                }
              }
            }),
            
            // Total likes received by user
            db.userLike.count({
              where: { userId }
            }),
            
            // Get user activity data
            db.userActivity.findUnique({
              where: { userId }
            }),
            
            // Get user's online status and last seen
            db.user.findUnique({
              where: { id: userId },
              select: {
                onlineStatus: true,
                lastSeen: true,
                likesCount: true
              }
            })
          ]);

          // Calculate helpful percentage
          const helpfulPercentage = totalMessages > 0 
            ? Math.min(Math.round((totalLikes / totalMessages / 0.1) * 100), 100)
            : 0;
          
          // Calculate user streak
          const lastSeen = user?.lastSeen || new Date();
          const daysSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
          const userStreak = daysSinceLastSeen <= 7 ? 7 - daysSinceLastSeen : 0;
          
          const data = {
            totalMessages,
            messagesToday,
            totalChannels,
            helpfulPercentage,
            userStreak,
            onlineStatus: user?.onlineStatus || 'offline',
            lastSeen: user?.lastSeen,
            likesCount: user?.likesCount || 0,
            totalLikes,
            activity: userActivity,
            timestamp: new Date().toISOString()
          };
          
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Error sending real-time user data:', error);
        }
      };
      
      // Send initial data
      sendData();
      
      // Set up interval to send updates every 10 seconds
      const interval = setInterval(sendData, 10000);
      
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
