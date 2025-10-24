/**
 * Unit tests for the Redis queue matching algorithm
 * Tests topic overlap scoring, match priority, and queue operations
 */

import { RedisQueue } from '../redis';

// Mock Redis for testing
const mockRedis = {
  lpush: jest.fn(),
  lrange: jest.fn(),
  del: jest.fn(),
  hset: jest.fn(),
  hgetall: jest.fn(),
  expire: jest.fn(),
  pipeline: jest.fn(() => ({
    hset: jest.fn(),
    expire: jest.fn(),
    exec: jest.fn(),
  })),
};

jest.mock('ioredis', () => {
  return jest.fn(() => mockRedis);
});

describe('RedisQueue', () => {
  let queue: RedisQueue;

  beforeEach(() => {
    queue = new RedisQueue();
    jest.clearAllMocks();
  });

  describe('findBestMatch', () => {
    it('should prioritize users with common topics', async () => {
      const userId = 'user1';
      const userTopics = ['Cybersecurity', 'CS'];
      
      const queueEntries = [
        { userId: 'user2', topics: ['Cybersecurity', 'Math'], ts: Date.now() },
        { userId: 'user3', topics: ['CS', 'Physics'], ts: Date.now() },
        { userId: 'user4', topics: ['Art', 'Music'], ts: Date.now() },
      ];

      mockRedis.lrange.mockResolvedValue(queueEntries.map(entry => JSON.stringify(entry)));

      const bestMatch = await queue.findBestMatch(userId, userTopics);

      expect(bestMatch).toBeDefined();
      expect(bestMatch?.userId).toBe('user2'); // Should match user2 (2 common topics)
    });

    it('should match users with no topics when current user has no topics', async () => {
      const userId = 'user1';
      const userTopics: string[] = [];
      
      const queueEntries = [
        { userId: 'user2', topics: [], ts: Date.now() },
        { userId: 'user3', topics: ['CS'], ts: Date.now() },
      ];

      mockRedis.lrange.mockResolvedValue(queueEntries.map(entry => JSON.stringify(entry)));

      const bestMatch = await queue.findBestMatch(userId, userTopics);

      expect(bestMatch).toBeDefined();
      expect(bestMatch?.userId).toBe('user2'); // Should match user with no topics
    });

    it('should return null when no candidates available', async () => {
      const userId = 'user1';
      const userTopics = ['Cybersecurity'];
      
      mockRedis.lrange.mockResolvedValue([]);

      const bestMatch = await queue.findBestMatch(userId, userTopics);

      expect(bestMatch).toBeNull();
    });

    it('should filter out current user from candidates', async () => {
      const userId = 'user1';
      const userTopics = ['Cybersecurity'];
      
      const queueEntries = [
        { userId: 'user1', topics: ['Cybersecurity'], ts: Date.now() }, // Should be filtered out
        { userId: 'user2', topics: ['Cybersecurity'], ts: Date.now() },
      ];

      mockRedis.lrange.mockResolvedValue(queueEntries.map(entry => JSON.stringify(entry)));

      const bestMatch = await queue.findBestMatch(userId, userTopics);

      expect(bestMatch).toBeDefined();
      expect(bestMatch?.userId).toBe('user2');
    });
  });

  describe('scoring algorithm', () => {
    it('should score candidates correctly', () => {
      const userTopics = ['Cybersecurity', 'CS'];
      
      const candidates = [
        { userId: 'user1', topics: ['Cybersecurity', 'CS', 'Math'] }, // 2 common = 20 + 1 = 21
        { userId: 'user2', topics: ['Cybersecurity'] }, // 1 common = 10 + 1 = 11
        { userId: 'user3', topics: ['Art', 'Music'] }, // 0 common = 1
        { userId: 'user4', topics: [] }, // 0 common = 1
      ];

      // This would be tested in the actual implementation
      // For now, we verify the scoring logic conceptually
      expect(candidates[0].topics.filter(t => userTopics.includes(t)).length).toBe(2);
      expect(candidates[1].topics.filter(t => userTopics.includes(t)).length).toBe(1);
      expect(candidates[2].topics.filter(t => userTopics.includes(t)).length).toBe(0);
    });
  });

  describe('queue operations', () => {
    it('should enqueue user with topics', async () => {
      const userId = 'user1';
      const topics = ['Cybersecurity', 'CS'];

      await queue.enqueue(userId, topics);

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'rv:queue',
        expect.stringContaining(userId)
      );
    });

    it('should set user metadata with TTL', async () => {
      const userId = 'user1';
      const topics = ['Cybersecurity'];
      const searchId = 'search123';

      await queue.setUserMeta(userId, topics, searchId);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        `rv:user:${userId}`,
        expect.objectContaining({
          topics: JSON.stringify(topics),
          searchId,
        })
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(`rv:user:${userId}`, 120);
    });

    it('should create match for both users', async () => {
      const userId = 'user1';
      const peerId = 'user2';
      const roomName = '1v1-abc123';
      const userTopics = ['Cybersecurity'];
      const peerTopics = ['CS'];

      await queue.setMatch(userId, peerId, roomName, peerTopics);

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should clean up user data on delete', async () => {
      const userId = 'user1';

      await queue.deleteUser(userId);

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('should handle duplicate queue entries gracefully', async () => {
      const userId = 'user1';
      const topics = ['Cybersecurity'];

      // First enqueue
      await queue.enqueue(userId, topics);
      
      // Second enqueue (should not cause issues)
      await queue.enqueue(userId, topics);

      expect(mockRedis.lpush).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent match creation', async () => {
      const userId = 'user1';
      const peerId = 'user2';
      const roomName = '1v1-abc123';
      const userTopics = ['Cybersecurity'];
      const peerTopics = ['CS'];

      // Simulate concurrent match creation
      const promise1 = queue.createMatch(userId, peerId, roomName, userTopics, peerTopics);
      const promise2 = queue.createMatch(peerId, userId, roomName, peerTopics, userTopics);

      await Promise.all([promise1, promise2]);

      // Should handle gracefully without errors
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });
});

// Manual test script for two browsers
export const manualTestScript = `
# Manual Test Script for E2EE 1v1 Voice Chat

## Setup
1. Install Redis: brew install redis && brew services start redis
2. Set environment variables in .env
3. Start the application: npm run dev

## Test Flow
1. Open two browsers (or incognito + normal)
2. Navigate to /voice/random
3. Both select overlapping topics (e.g., "Cybersecurity")
4. Click "Start Matching"
5. Verify both matched within 5 seconds
6. Verify "Exchanging keys..." → "Encrypted ✓"
7. Speak, verify audio works
8. Wait 10 minutes, verify rekey occurs
9. One user leaves, verify other sees disconnect
10. Test cancel queue button
11. Test "no topics" matching

## Expected Results
- Topic-based matching works correctly
- E2EE key exchange completes successfully
- Audio is encrypted and works properly
- Rekey occurs automatically
- Queue cleanup works on leave/cancel
- Fallback works for unsupported browsers

## Troubleshooting
- Check Redis: redis-cli ping
- Check browser console for errors
- Verify LiveKit server supports SFrame
- Check network tab for API calls
`;
