import { getRedisClient } from './redis';

// During 2FA enrollment the new TOTP secret is held here (in Redis, short-lived)
// instead of being persisted to the user row before the user has proven they can
// generate valid codes. The verify step promotes it to the user record.
const PREFIX = '2fa:pending:';
const TTL_SEC = 600; // 10 minutes to scan the QR and enter a code

/**
 * Store the pending secret. Returns true if it was stored in Redis; false lets
 * the caller fall back to persisting on the user row (e.g. dev without Redis).
 */
export async function setPendingTotpSecret(userId: string, secret: string): Promise<boolean> {
  try {
    await getRedisClient().set(`${PREFIX}${userId}`, secret, 'EX', TTL_SEC);
    return true;
  } catch (err) {
    console.error('setPendingTotpSecret failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

export async function getPendingTotpSecret(userId: string): Promise<string | null> {
  try {
    return await getRedisClient().get(`${PREFIX}${userId}`);
  } catch (err) {
    console.error('getPendingTotpSecret failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function clearPendingTotpSecret(userId: string): Promise<void> {
  try {
    await getRedisClient().del(`${PREFIX}${userId}`);
  } catch {
    // best effort — TTL will expire it anyway
  }
}
