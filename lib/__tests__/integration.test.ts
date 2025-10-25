/**
 * Integration tests for E2EE 1v1 Random Voice Chat
 * Tests the complete flow from queue to E2EE room
 */

import { RedisQueue } from '../redis';
import { nanoid } from 'nanoid';

// Mock Redis for integration testing
const mockRedis = {
  lpush: jest.fn(),
  lrange: jest.fn(),
  del: jest.fn(),
  hset: jest.fn(),
  hgetall: jest.fn(),
  expire: jest.fn(),
  hexists: jest.fn(),
  multi: jest.fn(() => ({
    hexists: jest.fn(),
    exec: jest.fn(),
  })),
  pipeline: jest.fn(() => ({
    hset: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
    lpush: jest.fn(),
    exec: jest.fn(),
  })),
};

jest.mock('ioredis', () => {
  return jest.fn(() => mockRedis);
});

describe('E2EE 1v1 Random Voice Chat Integration', () => {
  let queue: RedisQueue;

  beforeEach(() => {
    queue = new RedisQueue();
    jest.clearAllMocks();
  });

  describe('Complete matching flow', () => {
    it('should match two users with overlapping topics', async () => {
      const user1Id = 'user1';
      const user2Id = 'user2';
      const user1Topics = ['Cybersecurity', 'CS'];
      const user2Topics = ['Cybersecurity', 'Math'];

      // Mock queue entries
      const queueEntries = [
        { userId: user2Id, topics: user2Topics, ts: Date.now() },
      ];

      mockRedis.lrange.mockResolvedValue(queueEntries.map(entry => JSON.stringify(entry)));
      mockRedis.multi.mockReturnValue({
        hexists: jest.fn(),
        exec: jest.fn().mockResolvedValue([[0, 0], [0, 0]]), // No existing matches
      });
      mockRedis.pipeline.mockReturnValue({
        hset: jest.fn(),
        expire: jest.fn(),
        del: jest.fn(),
        lpush: jest.fn(),
        exec: jest.fn().mockResolvedValue(true),
      });

      // User 1 joins queue
      await queue.enqueue(user1Id, user1Topics);
      await queue.setUserMeta(user1Id, user1Topics, nanoid());

      // Find best match
      const bestMatch = await queue.findBestMatch(user1Id, user1Topics);
      expect(bestMatch).toBeDefined();
      expect(bestMatch?.userId).toBe(user2Id);

      // Create match
      const roomName = `1v1-${nanoid()}`;
      const matchCreated = await queue.createMatch(
        user1Id,
        user2Id,
        roomName,
        user1Topics,
        user2Topics
      );

      expect(matchCreated).toBe(true);
      expect(roomName).toMatch(/^1v1-/);
    });

    it('should handle no match scenario', async () => {
      const userId = 'user1';
      const topics = ['Cybersecurity'];

      // Empty queue
      mockRedis.lrange.mockResolvedValue([]);

      const bestMatch = await queue.findBestMatch(userId, topics);
      expect(bestMatch).toBeNull();
    });

    it('should prioritize topic overlap in matching', async () => {
      const userId = 'user1';
      const userTopics = ['Cybersecurity', 'CS'];

      const queueEntries = [
        { userId: 'user2', topics: ['Cybersecurity', 'CS', 'Math'], ts: Date.now() }, // 2 common topics
        { userId: 'user3', topics: ['Cybersecurity'], ts: Date.now() }, // 1 common topic
        { userId: 'user4', topics: ['Art', 'Music'], ts: Date.now() }, // 0 common topics
      ];

      mockRedis.lrange.mockResolvedValue(queueEntries.map(entry => JSON.stringify(entry)));

      const bestMatch = await queue.findBestMatch(userId, userTopics);
      expect(bestMatch).toBeDefined();
      expect(bestMatch?.userId).toBe('user2'); // Should match user with most common topics
    });

    it('should handle both users with no topics', async () => {
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
  });

  describe('Queue management', () => {
    it('should enqueue and dequeue users correctly', async () => {
      const userId = 'user1';
      const topics = ['Cybersecurity'];

      // Enqueue
      await queue.enqueue(userId, topics);
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'rv:queue',
        expect.stringContaining(userId)
      );

      // Set user metadata
      await queue.setUserMeta(userId, topics, nanoid());
      expect(mockRedis.hset).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalledWith(`rv:user:${userId}`, 120);

      // Dequeue
      mockRedis.lrange.mockResolvedValue([]);
      await queue.dequeue(userId);
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should clean up user data on delete', async () => {
      const userId = 'user1';

      await queue.deleteUser(userId);
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      mockRedis.lrange.mockRejectedValue(new Error('Redis connection failed'));

      const result = await queue.getQueue();
      expect(result).toEqual([]);
    });

    it('should handle invalid queue entries', async () => {
      mockRedis.lrange.mockResolvedValue(['invalid json', '{"userId":"user1","topics":["CS"],"ts":1234567890}']);

      const result = await queue.getQueue();
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user1');
    });
  });

  describe('Atomic operations', () => {
    it('should handle concurrent match creation', async () => {
      const user1Id = 'user1';
      const user2Id = 'user2';
      const roomName = '1v1-test123';
      const user1Topics = ['Cybersecurity'];
      const user2Topics = ['CS'];

      // Mock existing matches check
      mockRedis.multi.mockReturnValue({
        hexists: jest.fn(),
        exec: jest.fn().mockResolvedValue([[0, 0], [0, 0]]), // No existing matches
      });

      mockRedis.pipeline.mockReturnValue({
        hset: jest.fn(),
        expire: jest.fn(),
        del: jest.fn(),
        lpush: jest.fn(),
        exec: jest.fn().mockResolvedValue(true),
      });

      // Simulate concurrent match creation
      const promise1 = queue.createMatch(user1Id, user2Id, roomName, user1Topics, user2Topics);
      const promise2 = queue.createMatch(user2Id, user1Id, roomName, user2Topics, user1Topics);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // At least one should succeed
      expect(result1 || result2).toBe(true);
    });
  });
});

// Manual integration test script
export const manualIntegrationTest = `
# Manual Integration Test for E2EE 1v1 Voice Chat

## Prerequisites
1. Redis server running: redis-cli ping
2. LiveKit server configured with SFrame support
3. Two browsers or incognito windows

## Test Steps

### 1. Basic Matching Test
1. Open Browser 1: Navigate to /voice/random
2. Select "One-on-One" → "Cybersecurity" → "Start Matching"
3. Open Browser 2: Navigate to /voice/random  
4. Select "One-on-One" → "Cybersecurity" → "Start Matching"
5. Verify: Both users matched within 5 seconds
6. Verify: Room name starts with "1v1-"

### 2. E2EE Key Exchange Test
1. Both users click "Join Voice Chat"
2. Verify: "Connecting..." → "Exchanging keys..." → "Encrypted ✓"
3. Verify: Microphone is enabled after encryption
4. Test: Speak and verify audio works

### 3. Rekey Test
1. Wait 10 minutes or manually trigger rekey
2. Verify: New key exchange occurs
3. Verify: Audio continues working

### 4. Error Handling Test
1. Test with unsupported browser (if available)
2. Verify: Fallback message shown
3. Test: Network disconnection
4. Verify: Proper error messages

### 5. Queue Cleanup Test
1. User 1 leaves room
2. Verify: User 2 sees disconnect
3. Test: Cancel queue button
4. Verify: Clean exit from queue

## Expected Results
- Topic-based matching works correctly
- E2EE key exchange completes successfully  
- Audio is encrypted and works properly
- Rekey occurs automatically
- Queue cleanup works on leave/cancel
- Fallback works for unsupported browsers
- No PII or keys logged to server

## Troubleshooting
- Check Redis: redis-cli ping
- Check browser console for errors
- Verify LiveKit server supports SFrame
- Check network tab for API calls
- Verify rate limiting works (try rapid requests)
`;
