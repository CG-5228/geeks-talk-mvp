import { db } from './db';

export interface FeatureFlagRecord {
  key: string;
  label: string | null;
  description: string | null;
  enabled: boolean;
  rollout: number;
  audience: string | null;
}

type CacheEntry = { value: FeatureFlagRecord | null; expiresAt: number };
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

/**
 * Simple FNV-1a hash → [0, 99]. Deterministic per userId+key so rollout
 * assignment is stable across calls but differs between flags.
 */
function bucket(userId: string, key: string): number {
  let h = 2166136261;
  const s = `${userId}:${key}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100;
}

async function loadFlag(key: string): Promise<FeatureFlagRecord | null> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const row = await db.featureFlag.findUnique({
    where: { key },
    select: {
      key: true,
      label: true,
      description: true,
      enabled: true,
      rollout: true,
      audience: true,
    },
  });

  cache.set(key, { value: row, expiresAt: now + CACHE_TTL_MS });
  return row;
}

export function invalidateFeatureFlag(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

/**
 * Check whether a feature is enabled for an optional user.
 * - Flag missing → false (fail closed).
 * - Flag disabled → false.
 * - Flag enabled + rollout=100 or no userId → true.
 * - Flag enabled + rollout<100 + userId → deterministic bucket.
 */
export async function isFeatureEnabled(key: string, userId?: string | null): Promise<boolean> {
  const flag = await loadFlag(key);
  if (!flag || !flag.enabled) return false;
  if (flag.rollout >= 100) return true;
  if (flag.rollout <= 0) return false;
  if (!userId) return false;
  return bucket(userId, flag.key) < flag.rollout;
}

export async function getAllFlagsForAdmin() {
  return db.featureFlag.findMany({
    orderBy: { updatedAt: 'desc' },
  });
}
