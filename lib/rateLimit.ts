import { getRedisClient } from './redis';

type Key = string;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

// ---- In-memory fallback (per-instance) ----
// Used only when Redis is unavailable. Across a PM2 cluster this is NOT shared,
// so it is a best-effort backstop, not the primary limiter.
const buckets = new Map<Key, { count: number; resetAt: number }>();
let lastEviction = 0;

function memRateLimit(key: Key, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  // Periodically evict expired buckets so the Map can't grow unbounded.
  if (now - lastEviction > 60_000) {
    for (const [k, b] of buckets) {
      if (now > b.resetAt) buckets.delete(k);
    }
    lastEviction = now;
  }
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfter: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}

// ---- Redis-backed limiter ----
// Atomic fixed-window: INCR the counter, set the window TTL only on the first
// hit, and read the remaining TTL — all in one round trip so it is consistent
// across cluster workers.
const LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {c, ttl}
`;

// Circuit breaker: if Redis errors (e.g. not running in dev), skip it for a
// short window so we don't pay the connect/command timeout on every request.
let redisDownUntil = 0;

export async function rateLimit(
  key: Key,
  limit = 5,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  if (Date.now() < redisDownUntil) {
    return memRateLimit(key, limit, windowMs);
  }
  try {
    const redis = getRedisClient();
    const res = (await redis.eval(LUA, 1, `rl:${key}`, windowMs.toString())) as [number, number];
    const count = Number(res[0]);
    const ttl = Number(res[1]);
    if (count > limit) {
      return { allowed: false, remaining: 0, retryAfter: ttl > 0 ? ttl : windowMs };
    }
    return { allowed: true, remaining: Math.max(0, limit - count) };
  } catch {
    // Redis unavailable — back off and fall back to in-memory limiting.
    redisDownUntil = Date.now() + 30_000;
    return memRateLimit(key, limit, windowMs);
  }
}
