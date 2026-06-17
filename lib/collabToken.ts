import crypto from 'crypto';

// HMAC-signed, short-lived authorization token for the Yjs collaboration
// WebSocket. The token asserts that `userId` was confirmed server-side to be a
// member of `groupId`. The standalone WS server (lib/yjs-websocket-server.js)
// verifies the signature with the same NEXTAUTH_SECRET — keep the token format
// in sync between the two files.
const secret = () => process.env.NEXTAUTH_SECRET || '';

export function signCollabToken(payload: { userId: string; groupId: string }, ttlSec = 300): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec };
  const data = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyCollabToken(token: string): { userId: string; groupId: string } | null {
  const parts = (token || '').split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let body: any;
  try {
    body = JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch {
    return null;
  }
  if (!body || typeof body.userId !== 'string' || typeof body.groupId !== 'string') return null;
  if (typeof body.exp !== 'number' || body.exp < Math.floor(Date.now() / 1000)) return null;
  return { userId: body.userId, groupId: body.groupId };
}
