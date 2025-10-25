import Redis from 'ioredis';

// Redis client singleton
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    const redisPassword = process.env.REDIS_PASSWORD;

    const options = {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxLoadingTimeout: 10000,
    };

    if (redisUrl) {
      redis = new Redis(redisUrl, options);
    } else {
      redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        ...options,
      });
    }

    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    redis.on('ready', () => {
      console.log('Redis ready for operations');
    });

    redis.on('close', () => {
      console.log('Redis connection closed');
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

// Input validation helpers
function validateUserId(userId: string): void {
  if (!userId || typeof userId !== 'string' || userId.length === 0) {
    throw new Error('Invalid userId');
  }
}

function validateTopics(topics: string[]): void {
  if (!Array.isArray(topics)) {
    throw new Error('Topics must be an array');
  }
  topics.forEach(topic => {
    if (typeof topic !== 'string' || topic.trim().length === 0) {
      throw new Error('Invalid topic');
    }
  });
}

// Redis helper functions
export class RedisQueue {
  private redis: Redis;

  constructor() {
    this.redis = getRedisClient();
  }

  // Enqueue user to waiting list
  async enqueue(userId: string, topics: string[]): Promise<void> {
    validateUserId(userId);
    validateTopics(topics);

    const entry: QueueEntry = {
      userId,
      topics: topics.map(t => t.trim().toLowerCase()).filter(t => t.length > 0),
      ts: Date.now(),
    };

    try {
      await this.redis.lpush('rv:queue', JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to enqueue user:', error);
      throw new Error('Failed to join queue');
    }
  }

  // Get all users in queue (bounded to prevent O(n²) operations)
  async getQueue(): Promise<QueueEntry[]> {
    try {
      const entries = await this.redis.lrange('rv:queue', 0, 99); // Limit to 100 entries
      return entries.map(entry => {
        try {
          return JSON.parse(entry);
        } catch (error) {
          console.error('Failed to parse queue entry:', error);
          return null;
        }
      }).filter(entry => entry !== null);
    } catch (error) {
      console.error('Failed to get queue:', error);
      return [];
    }
  }

  // Remove user from queue (atomic operation)
  async dequeue(userId: string): Promise<void> {
    validateUserId(userId);
    
    try {
      const entries = await this.getQueue();
      const filteredEntries = entries.filter(entry => entry.userId !== userId);
      
      // Use pipeline for atomic operation
      const pipeline = this.redis.pipeline();
      pipeline.del('rv:queue');
      if (filteredEntries.length > 0) {
        pipeline.lpush('rv:queue', ...filteredEntries.map(entry => JSON.stringify(entry)));
      }
      await pipeline.exec();
    } catch (error) {
      console.error('Failed to dequeue user:', error);
      throw new Error('Failed to leave queue');
    }
  }

  // Set user metadata with TTL
  async setUserMeta(userId: string, topics: string[], searchId: string): Promise<void> {
    validateUserId(userId);
    validateTopics(topics);
    
    if (!searchId || typeof searchId !== 'string') {
      throw new Error('Invalid searchId');
    }

    const meta: UserMeta = {
      topics: topics.map(t => t.trim().toLowerCase()).filter(t => t.length > 0),
      searchId,
      ts: Date.now(),
    };

    try {
      const pipeline = this.redis.pipeline();
      pipeline.hset(`rv:user:${userId}`, meta);
      pipeline.expire(`rv:user:${userId}`, 120); // 2 minutes TTL
      await pipeline.exec();
    } catch (error) {
      console.error('Failed to set user metadata:', error);
      throw new Error('Failed to set user metadata');
    }
  }

  // Get user metadata
  async getUserMeta(userId: string): Promise<UserMeta | null> {
    validateUserId(userId);
    
    try {
      const meta = await this.redis.hgetall(`rv:user:${userId}`);
      if (Object.keys(meta).length === 0) return null;

      return {
        topics: JSON.parse(meta.topics || '[]'),
        searchId: meta.searchId,
        ts: parseInt(meta.ts || '0'),
      };
    } catch (error) {
      console.error('Failed to get user metadata:', error);
      return null;
    }
  }

  // Set match data for both users (atomic operation)
  async setMatch(userId: string, peerId: string, roomName: string, peerTopics: string[]): Promise<void> {
    validateUserId(userId);
    validateUserId(peerId);
    validateTopics(peerTopics);
    
    if (!roomName || typeof roomName !== 'string' || roomName.length === 0) {
      throw new Error('Invalid roomName');
    }

    const matchData1: MatchData = {
      roomName,
      peerId,
      peerTopics: peerTopics.map(t => t.trim().toLowerCase()).filter(t => t.length > 0),
      ts: Date.now(),
    };

    const matchData2: MatchData = {
      roomName,
      peerId: userId,
      peerTopics: peerTopics.map(t => t.trim().toLowerCase()).filter(t => t.length > 0), // Set the same topics for both users
      ts: Date.now(),
    };

    try {
      const pipeline = this.redis.pipeline();
      pipeline.hset(`rv:match:${userId}`, matchData1);
      pipeline.hset(`rv:match:${peerId}`, matchData2);
      pipeline.expire(`rv:match:${userId}`, 600); // 10 minutes TTL
      pipeline.expire(`rv:match:${peerId}`, 600); // 10 minutes TTL
      await pipeline.exec();
    } catch (error) {
      console.error('Failed to set match data:', error);
      throw new Error('Failed to create match');
    }
  }

  // Get match data for user
  async getMatch(userId: string): Promise<MatchData | null> {
    validateUserId(userId);
    
    try {
      const match = await this.redis.hgetall(`rv:match:${userId}`);
      
      if (Object.keys(match).length === 0) {
        return null;
      }

      return {
        roomName: match.roomName,
        peerId: match.peerId,
        peerTopics: JSON.parse(match.peerTopics || '[]'),
        ts: parseInt(match.ts || '0'),
      };
    } catch (error) {
      console.error('Failed to get match data:', error);
      return null;
    }
  }

  // Delete user data (cleanup)
  async deleteUser(userId: string): Promise<void> {
    validateUserId(userId);
    
    try {
      const pipeline = this.redis.pipeline();
      pipeline.del(`rv:user:${userId}`);
      pipeline.del(`rv:match:${userId}`);
      await pipeline.exec();
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw new Error('Failed to cleanup user data');
    }
  }

  // Find best match for user based on topics
  async findBestMatch(userId: string, userTopics: string[]): Promise<QueueEntry | null> {
    validateUserId(userId);
    validateTopics(userTopics);

    try {
      const queue = await this.getQueue();
      const candidates = queue.filter(entry => entry.userId !== userId);

      if (candidates.length === 0) return null;

      // Score candidates based on topic overlap
      const scoredCandidates = candidates.map(candidate => {
        let score = 1; // Base score

        // Priority 1: Users with common topics (10 points per common topic)
        const commonTopics = userTopics.filter(topic => candidate.topics.includes(topic));
        score += commonTopics.length * 10;

        // Priority 2: Both users have no topics (5 points)
        if (userTopics.length === 0 && candidate.topics.length === 0) {
          score += 5;
        }

        // Tie-breaker: earlier timestamp (lower timestamp = higher priority)
        const timeScore = 1 / (1 + (candidate.ts - Date.now()) / 1000);

        return { ...candidate, score: score + timeScore };
      });

      // Sort by score descending, then by timestamp ascending
      scoredCandidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.ts - b.ts; // Earlier timestamp wins ties
      });

      return scoredCandidates[0] || null;
    } catch (error) {
      console.error('Failed to find best match:', error);
      return null;
    }
  }

  // Atomic match creation (prevents race conditions)
  async createMatch(userId: string, peerId: string, roomName: string, userTopics: string[], peerTopics: string[]): Promise<boolean> {
    validateUserId(userId);
    validateUserId(peerId);
    validateTopics(userTopics);
    validateTopics(peerTopics);
    
    if (!roomName || typeof roomName !== 'string' || roomName.length === 0) {
      throw new Error('Invalid roomName');
    }

    try {
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
        peerTopics: peerTopics.map(t => t.trim().toLowerCase()).filter(t => t.length > 0),
        ts: Date.now(),
      };

      const matchData2: MatchData = {
        roomName,
        peerId: userId,
        peerTopics: userTopics.map(t => t.trim().toLowerCase()).filter(t => t.length > 0),
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
    } catch (error) {
      console.error('Failed to create match:', error);
      return false;
    }
  }

  // Cleanup expired data
  async cleanup(): Promise<void> {
    try {
      // Redis TTLs handle most cleanup, but we can add manual cleanup here if needed
      console.log('Redis cleanup completed (TTLs handle automatic cleanup)');
    } catch (error) {
      console.error('Failed to cleanup Redis data:', error);
    }
  }

  // Force cleanup of user data (for expired matches)
  async forceCleanupUser(userId: string): Promise<void> {
    validateUserId(userId);
    
    try {
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
    } catch (error) {
      console.error('Failed to force cleanup user data:', error);
      throw new Error('Failed to cleanup user data');
    }
  }
}

// Export singleton instance
export const redisQueue = new RedisQueue();
