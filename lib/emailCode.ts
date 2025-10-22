import { db } from './db';
import crypto from 'crypto';

export type EmailCodePurpose = 'signup' | 'reset' | 'change';

export interface EmailCodeConfig {
  ttl: number; // Time to live in minutes
  maxAttempts: number;
  codeLength: number;
}

const CODE_CONFIGS: Record<EmailCodePurpose, EmailCodeConfig> = {
  signup: { ttl: 15, maxAttempts: 3, codeLength: 6 },
  reset: { ttl: 30, maxAttempts: 5, codeLength: 6 },
  change: { ttl: 10, maxAttempts: 3, codeLength: 6 }
};

/**
 * Generate a random verification code
 */
export function generateCode(length: number = 6): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

/**
 * Hash a verification code for secure storage
 */
export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Create a new email verification code
 */
export async function createEmailCode(
  email: string,
  purpose: EmailCodePurpose,
  userId?: string
): Promise<{ code: string; expiresAt: Date }> {
  const config = CODE_CONFIGS[purpose];
  const code = generateCode(config.codeLength);
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + config.ttl * 60 * 1000);

  // Clean up any existing codes for this email/purpose
  await db.emailCode.deleteMany({
    where: {
      email,
      purpose,
      OR: [
        { expiresAt: { lt: new Date() } },
        { consumedAt: { not: null } }
      ]
    }
  });

  // Create new code
  await db.emailCode.create({
    data: {
      email,
      userId,
      purpose,
      codeHash,
      expiresAt
    }
  });

  return { code, expiresAt };
}

/**
 * Verify an email code
 */
export async function verifyEmailCode(
  email: string,
  code: string,
  purpose: EmailCodePurpose
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const config = CODE_CONFIGS[purpose];
  const codeHash = hashCode(code);

  // Find the code
  const emailCode = await db.emailCode.findFirst({
    where: {
      email,
      purpose,
      codeHash,
      expiresAt: { gt: new Date() },
      consumedAt: null
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!emailCode) {
    return { valid: false, error: 'Invalid or expired code' };
  }

  // Check attempts
  if (emailCode.attempts >= config.maxAttempts) {
    return { valid: false, error: 'Too many attempts. Please request a new code.' };
  }

  // Increment attempts
  await db.emailCode.update({
    where: { id: emailCode.id },
    data: { attempts: emailCode.attempts + 1 }
  });

  // Mark as consumed
  await db.emailCode.update({
    where: { id: emailCode.id },
    data: { consumedAt: new Date() }
  });

  return { valid: true, userId: emailCode.userId || undefined };
}

/**
 * Clean up expired codes
 */
export async function cleanupExpiredCodes(): Promise<void> {
  await db.emailCode.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { consumedAt: { not: null } }
      ]
    }
  });
}

/**
 * Get code info without consuming it
 */
export async function getCodeInfo(
  email: string,
  purpose: EmailCodePurpose
): Promise<{ exists: boolean; attempts: number; expiresAt?: Date }> {
  const emailCode = await db.emailCode.findFirst({
    where: {
      email,
      purpose,
      expiresAt: { gt: new Date() },
      consumedAt: null
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!emailCode) {
    return { exists: false, attempts: 0 };
  }

  return {
    exists: true,
    attempts: emailCode.attempts,
    expiresAt: emailCode.expiresAt
  };
}
