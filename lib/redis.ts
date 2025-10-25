import Redis from 'ioredis';

// Redis client singleton
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    const redisPassword = process.env.REDIS_PASSWORD;

    if (redisUrl) {
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    } else {
      redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    }

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  return redis;
}

// Types for queue operations
export interface QueueEntry {
  userId: string;
  topics: string[];
  ts: number;
}

export interface UserMeta {
  topics: string[];
  searchId: string;
  ts: number;
}

export interface MatchData {
  roomName: string;
  peerId: string;
  peerTopics: string[];
  ts: number;
}

// Redis helper functions
export class RedisQueue {
  private redis: Redis;

  constructor() {
    this.redis = getRedisClient();
  }

  // Enqueue user to waiting list
  async enqueue(userId: string, topics: string[]): Promise<void> {
    const entry: QueueEntry = {
      userId,
      topics,
      ts: Date.now(),
    };

    await this.redis.lpush('rv:queue', JSON.stringify(entry));
  }

  // Get all users in queue
  async getQueue(): Promise<QueueEntry[]> {
    const entries = await this.redis.lrange('rv:queue', 0, -1);
    return entries.map(entry => JSON.parse(entry));
  }

  // Remove user from queue
  async dequeue(userId: string): Promise<void> {
    const entries = await this.getQueue();
    const filteredEntries = entries.filter(entry => entry.userId !== userId);
    
    // Clear and repopulate queue
    await this.redis.del('rv:queue');
    if (filteredEntries.length > 0) {
      await this.redis.lpush('rv:queue', ...filteredEntries.map(entry => JSON.stringify(entry)));
    }
  }

  // Set user metadata with TTL
  async setUserMeta(userId: string, topics: string[], searchId: string): Promise<void> {
    const meta: UserMeta = {
      topics,
      searchId,
      ts: Date.now(),
    };

    await this.redis.hset(`rv:user:${userId}`, meta);
    await this.redis.expire(`rv:user:${userId}`, 120); // 2 minutes TTL
  }

  // Get user metadata
  async getUserMeta(userId: string): Promise<UserMeta | null> {
    const meta = await this.redis.hgetall(`rv:user:${userId}`);
    if (Object.keys(meta).length === 0) return null;

    return {
      topics: JSON.parse(meta.topics || '[]'),
      searchId: meta.searchId,
      ts: parseInt(meta.ts || '0'),
    };
  }

  // Set match data for both users
  async setMatch(userId: string, peerId: string, roomName: string, peerTopics: string[]): Promise<void> {
    const matchData1: MatchData = {
      roomName,
      peerId,
      peerTopics,
      ts: Date.now(),
    };

    const matchData2: MatchData = {
      roomName,
      peerId: userId,
      peerTopics: [], // This will be set by the calling function
      ts: Date.now(),
    };

    const pipeline = this.redis.pipeline();
    pipeline.hset(`rv:match:${userId}`, matchData1);
    pipeline.hset(`rv:match:${peerId}`, matchData2);
    pipeline.expire(`rv:match:${userId}`, 600); // 10 minutes TTL
    pipeline.expire(`rv:match:${peerId}`, 600); // 10 minutes TTL
    await pipeline.exec();
  }

  // Get match data for user
  async getMatch(userId: string): Promise<MatchData | null> {
    console.log(`Getting match for user ${userId}`);
    const match = await this.redis.hgetall(`rv:match:${userId}`);
    console.log(`Raw match data for ${userId}:`, match);
    
    if (Object.keys(match).length === 0) {
      console.log(`No match data found for user ${userId}`);
      return null;
    }

    const result = {
      roomName: match.roomName,
      peerId: match.peerId,
      peerTopics: JSON.parse(match.peerTopics || '[]'),
      ts: parseInt(match.ts || '0'),
    };
    
    console.log(`Processed match data for ${userId}:`, result);
    return result;
  }

  // Delete user data (cleanup)
  async deleteUser(userId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(`rv:user:${userId}`);
    pipeline.del(`rv:match:${userId}`);
    await pipeline.exec();
  }

  // Find best match for user based on topics
  async findBestMatch(userId: string, userTopics: string[]): Promise<QueueEntry | null> {
    const queue = await this.getQueue();
    const candidates = queue.filter(entry => entry.userId !== userId);

    if (candidates.length === 0) return null;

    // Score candidates based on topic overlap
    const scoredCandidates = candidates.map(candidate => {
      let score = 1; // Base score

      // Priority 1: Users with common topics
      const commonTopics = userTopics.filter(topic => candidate.topics.includes(topic));
      score += commonTopics.length * 10;

      // Priority 2: Both users have no topics
      if (userTopics.length === 0 && candidate.topics.length === 0) {
        score += 5;
      }

      return { ...candidate, score };
    });

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    return scoredCandidates[0] || null;
  }

  // Atomic match creation (prevents race conditions)
  async createMatch(userId: string, peerId: string, roomName: string, userTopics: string[], peerTopics: string[]): Promise<boolean> {
    // Use Redis transaction to ensure atomicity
    const multi = this.redis.multi();
    
    // Check if either user already has a match
    multi.hexists(`rv:match:${userId}`, 'roomName');
    multi.hexists(`rv:match:${peerId}`, 'roomName');
    
    const results = await multi.exec();
    if (!results) return false;

    const [userIdMatch, peerIdMatch] = results;
    if (userIdMatch[1] === 1 || peerIdMatch[1] === 1) {
      return false; // One of the users already has a match
    }

    // Create the match for BOTH users atomically
    const matchData1: MatchData = {
      roomName,
      peerId,
      peerTopics,
      ts: Date.now(),
    };

    const matchData2: MatchData = {
      roomName,
      peerId: userId,
      peerTopics: userTopics,
      ts: Date.now(),
    };

    // Use transaction to set both matches and remove from queue atomically
    const matchMulti = this.redis.multi();
    
    // Set match data for both users
    matchMulti.hset(`rv:match:${userId}`, matchData1);
    matchMulti.hset(`rv:match:${peerId}`, matchData2);
    
    // Set TTL for both matches
    matchMulti.expire(`rv:match:${userId}`, 600); // 10 minutes
    matchMulti.expire(`rv:match:${peerId}`, 600); // 10 minutes
    
    // Remove both users from queue
    const queueEntries = await this.getQueue();
    const filteredEntries = queueEntries.filter(entry => 
      entry.userId !== userId && entry.userId !== peerId
    );
    
    matchMulti.del('rv:queue');
    if (filteredEntries.length > 0) {
      matchMulti.lpush('rv:queue', ...filteredEntries.map(entry => JSON.stringify(entry)));
    }
    
    const matchResults = await matchMulti.exec();
    return matchResults !== null;
  }

  // Cleanup expired data
  async cleanup(): Promise<void> {
    // Redis TTLs handle most cleanup, but we can add manual cleanup here if needed
    console.log('Redis cleanup completed (TTLs handle automatic cleanup)');
  }

  // Force cleanup of user data (for expired matches)
  async forceCleanupUser(userId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(`rv:user:${userId}`);
    pipeline.del(`rv:match:${userId}`);
    // Remove from queue if present
    const queueEntries = await this.getQueue();
    const filteredEntries = queueEntries.filter(entry => entry.userId !== userId);
    pipeline.del('rv:queue');
    if (filteredEntries.length > 0) {
      pipeline.lpush('rv:queue', ...filteredEntries.map(entry => JSON.stringify(entry)));
    }
    await pipeline.exec();
    console.log(`Force cleaned user data for ${userId}`);
  }
}

// Export singleton instance
export const redisQueue = new RedisQueue();
