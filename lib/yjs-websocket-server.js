// Yjs WebSocket server for real-time collaboration (authenticated).
//
// Every connection must present a short-lived HMAC token issued by
// /api/collaboration/token (granted only to voice-group members). The token
// asserts { userId, groupId }; we verify the signature with NEXTAUTH_SECRET and
// require token.groupId === the requested doc name, so a connection cannot read
// or write a document the user isn't authorized for.
//
// Keep the token format in sync with lib/collabToken.ts.
const WebSocket = require('ws');
const crypto = require('crypto');
// Vendored, yjs-13-compatible server utils (y-websocket@3 dropped bin/utils).
const { setupWSConnection } = require('./yjs/wsUtils.cjs');

const port = process.env.PORT || 3001;
const host = process.env.HOST || 'localhost';

function verifyCollabToken(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const secret = process.env.NEXTAUTH_SECRET || '';
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  let body;
  try {
    body = JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch {
    return null;
  }
  if (!body || typeof body.userId !== 'string' || typeof body.groupId !== 'string') return null;
  if (typeof body.exp !== 'number' || body.exp < Math.floor(Date.now() / 1000)) return null;
  return { userId: body.userId, groupId: body.groupId };
}

if (!process.env.NEXTAUTH_SECRET) {
  console.error('[yjs] NEXTAUTH_SECRET is not set — all collaboration connections will be rejected.');
}

const wss = new WebSocket.Server({ port, host, perMessageDeflate: false });

wss.on('connection', (ws, req) => {
  // y-websocket connects to "<wsUrl>/<docName>?token=<token>".
  let docName = '';
  let token = '';
  try {
    const url = new URL(req.url, `http://${req.headers.host || host}`);
    docName = decodeURIComponent((url.pathname.slice(1).split('/')[0]) || '');
    token = url.searchParams.get('token') || '';
  } catch {
    ws.close(1008, 'Bad request');
    return;
  }

  const claims = verifyCollabToken(token);
  if (!claims || claims.groupId !== docName) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  setupWSConnection(ws, req);
});

console.log(`Yjs WebSocket server running on ws://${host}:${port}`);
console.log('Ready for authenticated collaborative editing connections...');

process.on('SIGINT', () => {
  wss.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  wss.close(() => process.exit(0));
});
