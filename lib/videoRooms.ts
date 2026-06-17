import { getRedisClient } from './redis';

// Redis-backed authorization for LiveKit video rooms. A user is added to a
// room's member set at the legitimate entry points (create / join-by-code /
// random match); the token routes then verify membership before minting a
// token. Stored in Redis so the check is consistent across PM2 cluster workers,
// with a TTL matching the room's lifetime.
const MEMBER_PREFIX = 'video:room:';

/** Authorize `userId` for `roomName` for the next `ttlSec` seconds. */
export async function addVideoRoomMember(roomName: string, userId: string, ttlSec: number): Promise<void> {
  if (!roomName || !userId) return;
  try {
    const redis = getRedisClient();
    const key = `${MEMBER_PREFIX}${roomName}`;
    await redis.sadd(key, userId);
    await redis.expire(key, ttlSec);
  } catch (err) {
    // Non-fatal: in dev without Redis the membership check fails open (below).
    console.error('addVideoRoomMember failed:', err instanceof Error ? err.message : err);
  }
}

/**
 * True if `userId` is authorized for `roomName`. Fails CLOSED in production (a
 * Redis outage must not become a token free-for-all) but OPEN in development so
 * local video works without a running Redis.
 */
export async function isVideoRoomMember(roomName: string, userId: string): Promise<boolean> {
  if (!roomName || !userId) return false;
  try {
    const redis = getRedisClient();
    return (await redis.sismember(`${MEMBER_PREFIX}${roomName}`, userId)) === 1;
  } catch (err) {
    console.error('isVideoRoomMember failed:', err instanceof Error ? err.message : err);
    return process.env.NODE_ENV !== 'production';
  }
}
