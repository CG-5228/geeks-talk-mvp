import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(length = 20): string {
  const bytes = crypto.randomBytes(length);
  return encodeBase32(bytes);
}

export function encodeBase32(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function decodeBase32(input: string): Buffer {
  const cleaned = input.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTOTP(
  secret: string,
  opts: { step?: number; digits?: number; timestamp?: number } = {},
): string {
  const step = opts.step ?? 30;
  const digits = opts.digits ?? 6;
  const t = Math.floor((opts.timestamp ?? Date.now()) / 1000 / step);
  const key = decodeBase32(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(t));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 10 ** digits).toString().padStart(digits, '0');
}

export function verifyTOTP(
  secret: string,
  token: string,
  opts: { step?: number; digits?: number; window?: number } = {},
): boolean {
  const step = opts.step ?? 30;
  const digits = opts.digits ?? 6;
  const window = opts.window ?? 1;
  const now = Date.now();
  for (let offset = -window; offset <= window; offset++) {
    const t = now + offset * step * 1000;
    const candidate = generateTOTP(secret, { step, digits, timestamp: t });
    if (timingSafeEqualStr(candidate, token)) return true;
  }
  return false;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  try {
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export function buildOtpAuthUrl(params: {
  secret: string;
  accountName: string;
  issuer?: string;
  digits?: number;
  step?: number;
}): string {
  const issuer = params.issuer ?? 'Geeks Talk';
  const label = `${issuer}:${params.accountName}`;
  const qs = new URLSearchParams({
    secret: params.secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(params.digits ?? 6),
    period: String(params.step ?? 30),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${qs.toString()}`;
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(5);
    const raw = encodeBase32(bytes).slice(0, 10);
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}

export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}
