import { db } from './db';

export async function trackUserActivity(
  userId: string, 
  type: 'message' | 'voice' | 'online'
) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Update or create user activity record
    await db.userActivity.upsert({
      where: { userId },
      update: {
        totalMessages: type === 'message' ? { increment: 1 } : undefined,
        voiceMinutes: type === 'voice' ? { increment: 1 } : undefined,
        totalOnlineTime: type === 'online' ? { increment: 1 } : undefined,
        lastActive: new Date()
      },
      create: {
        userId,
        totalMessages: type === 'message' ? 1 : 0,
        voiceMinutes: type === 'voice' ? 1 : 0,
        totalOnlineTime: type === 'online' ? 1 : 0,
        lastActive: new Date()
      }
    });
    
    // Update daily stats
    await updateDailyStats(today, type);
  } catch (error) {
    console.error('Failed to track user activity:', error);
  }
}

export async function trackUserLike(userId: string, likedBy: string) {
  try {
    // Create like record
    await db.userLike.create({
      data: {
        userId,
        likedBy
      }
    });
    
    // Update user's likes count
    await db.user.update({
      where: { id: userId },
      data: {
        likesCount: { increment: 1 }
      }
    });
  } catch (error) {
    console.error('Failed to track user like:', error);
  }
}

export async function removeUserLike(userId: string, likedBy: string) {
  try {
    // Remove like record
    await db.userLike.deleteMany({
      where: {
        userId,
        likedBy
      }
    });
    
    // Update user's likes count
    await db.user.update({
      where: { id: userId },
      data: {
        likesCount: { decrement: 1 }
      }
    });
  } catch (error) {
    console.error('Failed to remove user like:', error);
  }
}

export async function updateOnlineStatus(
  userId: string, 
  status: 'online' | 'offline'
) {
  try {
    await db.user.update({
      where: { id: userId },
      data: { 
        onlineStatus: status, 
        lastSeen: new Date() 
      }
    });
    
    // Track online activity
    if (status === 'online') {
      await trackUserActivity(userId, 'online');
    }
  } catch (error) {
    console.error('Failed to update online status:', error);
  }
}

export async function updateDailyStats(date: Date, type: 'message' | 'voice' | 'online' | 'contact') {
  try {
    // Recompute real values for the day instead of incrementing, to avoid inflation from heartbeats
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const [activeUsers, onlineUsers, messagesSent, contactMessages, activeGroups] = await Promise.all([
      db.user.count({
        where: { lastSeen: { gte: dayStart, lte: dayEnd } }
      }),
      db.user.count({
        where: { onlineStatus: 'online' }
      }),
      db.message.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd } }
      }),
      db.contactMessage.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd } }
      }),
      db.voiceGroup.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd }, members: { some: {} } }
      })
    ]);

    await db.dailyStats.upsert({
      where: { date: dayStart },
      update: { activeUsers, onlineUsers, messagesSent, contactMessages, activeGroups },
      create: { date: dayStart, activeUsers, onlineUsers, messagesSent, contactMessages, activeGroups }
    });
  } catch (error) {
    console.error('Failed to update daily stats:', error);
  }
}

export async function getDashboardStats(period: 'day' | 'week' | 'month') {
  try {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    // Get real-time data from actual database queries
    const [
      onlineUsers,
      activeUsers,
      totalMessages,
      contactMessages,
      activeGroups,
      totalChannels,
      helpfulPercentage,
      userStreaks
    ] = await Promise.all([
      // Current online users
      db.user.count({
        where: { onlineStatus: 'online' }
      }),
      
      // Active users (last 24 hours)
      db.user.count({
        where: {
          lastSeen: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Total messages sent in period
      db.message.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: now
          }
        }
      }),
      
      // Contact messages in period
      db.contactMessage.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: now
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
      
      // Calculate helpful percentage based on likes vs total interactions
      calculateHelpfulPercentage(),
      
      // Calculate average user streak
      calculateAverageStreak()
    ]);
    
    // Get chart data
    const dailyStats = await getChartData(period);
    
    return {
      activeUsers,
      onlineUsers,
      messagesSent: totalMessages,
      contactMessages,
      activeGroups,
      totalChannels,
      helpfulPercentage,
      averageStreak: userStreaks,
      feedbackStars: helpfulPercentage / 20, // Convert percentage to 5-star scale
      dailyStats
    };
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return {
      activeUsers: 0,
      onlineUsers: 0,
      messagesSent: 0,
      contactMessages: 0,
      activeGroups: 0,
      totalChannels: 0,
      helpfulPercentage: 0,
      averageStreak: 0,
      feedbackStars: 0,
      dailyStats: []
    };
  }
}

// Helper function to calculate helpful percentage based on likes vs total interactions
async function calculateHelpfulPercentage(): Promise<number> {
  try {
    const [totalLikes, totalUsers] = await Promise.all([
      db.userLike.count(),
      db.user.count()
    ]);
    
    if (totalUsers === 0) return 0;
    
    // Calculate percentage based on likes per user ratio
    const likesPerUser = totalLikes / totalUsers;
    const maxLikesPerUser = 10; // Assume max 10 likes per user for 100%
    const percentage = Math.min((likesPerUser / maxLikesPerUser) * 100, 100);
    
    return Math.round(percentage);
  } catch (error) {
    console.error('Failed to calculate helpful percentage:', error);
    return 0;
  }
}

// Helper function to calculate average user streak
async function calculateAverageStreak(): Promise<number> {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        lastSeen: true,
        createdAt: true
      }
    });
    
    if (users.length === 0) return 0;
    
    const now = new Date();
    const streaks = users.map(user => {
      const lastSeen = user.lastSeen || user.createdAt;
      const daysSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));
      
      // If user was active in last 7 days, count as active streak
      if (daysSinceLastSeen <= 7) {
        return 7 - daysSinceLastSeen;
      }
      return 0;
    });
    
    const averageStreak = streaks.reduce((sum, streak) => sum + streak, 0) / users.length;
    return Math.round(averageStreak);
  } catch (error) {
    console.error('Failed to calculate average streak:', error);
    return 0;
  }
}

export async function getChartData(period: 'day' | 'week' | 'month') {
  try {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    // Get real-time data for each day in the period
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const [activeUsers, onlineUsers, messagesSent, contactMessages, activeGroups] = await Promise.all([
        db.user.count({
          where: {
            lastSeen: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        }),
        db.user.count({
          where: {
            onlineStatus: 'online',
            lastSeen: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        }),
        db.message.count({
          where: {
            createdAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        }),
        db.contactMessage.count({
          where: {
            createdAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        }),
        db.voiceGroup.count({
          where: {
            members: {
              some: {}
            },
            createdAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        })
      ]);
      
      days.push({
        date: dayStart.toISOString().split('T')[0],
        activeUsers,
        onlineUsers,
        messagesSent,
        contactMessages,
        activeGroups
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  } catch (error) {
    console.error('Failed to get chart data:', error);
    return [];
  }
}