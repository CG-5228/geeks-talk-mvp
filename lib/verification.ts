import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

const TTL_MIN = Number(process.env.VERIFICATION_CODE_TTL_MIN || 10);
const MAX_ATTEMPTS = Number(process.env.VERIFICATION_MAX_ATTEMPTS || 5);

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOrReplaceEmailCode(email: string, purpose: 'signup'|'reset'|'change', userId?: string) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + TTL_MIN * 60_000);

  // Invalidate previous active codes for this email/purpose
  await db.emailCode.deleteMany({ where: { email, purpose, consumedAt: null } }).catch(() => {});

  await db.emailCode.create({
    data: { email, userId: userId || null, purpose, codeHash, expiresAt },
  });

  return { code, expiresAt };
}

export async function verifyAndConsumeEmailCode(email: string, purpose: 'signup'|'reset'|'change', code: string) {
  const rec = await db.emailCode.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: 'desc' },
  });
  if (!rec) return { ok: false, reason: 'not_found' as const };
  if (rec.consumedAt) return { ok: false, reason: 'used' as const };
  if (new Date() > rec.expiresAt) return { ok: false, reason: 'expired' as const };
  if (rec.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'locked' as const };

  const match = await bcrypt.compare(code, rec.codeHash);
  if (!match) {
    await db.emailCode.update({ where: { id: rec.id }, data: { attempts: rec.attempts + 1 } });
    return { ok: false, reason: 'mismatch' as const };
  }

  await db.emailCode.update({ where: { id: rec.id }, data: { consumedAt: new Date() } });
  return { ok: true as const };
}

export function isAllowedEmailDomain(email: string) {
  const allowed = ['icloud.com','gmail.com','outlook.com','yahoo.com','qq.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  return !!domain && allowed.includes(domain);
}


