import crypto from 'crypto';

// In-memory cache for session-based admin hashes
// Format: { hash: { userId: string, expiresAt: number } }
const adminHashCache = new Map<string, { userId: string; expiresAt: number }>();

// Hash expiration time: 1 hour
const HASH_EXPIRATION_MS = 60 * 60 * 1000;

// Cleanup expired hashes every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [hash, data] of adminHashCache.entries()) {
    if (data.expiresAt < now) {
      adminHashCache.delete(hash);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a new session-based admin hash for a user
 * This hash is temporary and expires after 1 hour
 */
export function generateSessionAdminHash(userId: string): string {
  const hash = crypto.randomBytes(16).toString('hex');
  
  // Store in cache with expiration
  adminHashCache.set(hash, {
    userId,
    expiresAt: Date.now() + HASH_EXPIRATION_MS
  });
  
  return hash;
}

/**
 * Validate a session-based admin hash
 * Returns the userId if valid, null otherwise
 */
export function validateSessionAdminHash(hash: string): string | null {
  const data = adminHashCache.get(hash);
  
  if (!data) {
    return null; // Hash not found
  }
  
  if (data.expiresAt < Date.now()) {
    // Expired, remove it
    adminHashCache.delete(hash);
    return null;
  }
  
  return data.userId;
}

/**
 * Invalidate all hashes for a specific user (e.g., on logout)
 */
export function invalidateUserHashes(userId: string): void {
  for (const [hash, data] of adminHashCache.entries()) {
    if (data.userId === userId) {
      adminHashCache.delete(hash);
    }
  }
}

/**
 * Get the number of active session hashes (for debugging)
 */
export function getActiveHashCount(): number {
  const now = Date.now();
  let count = 0;
  for (const data of adminHashCache.values()) {
    if (data.expiresAt >= now) {
      count++;
    }
  }
  return count;
}
