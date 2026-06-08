import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { subscribe, type LiveEvent } from '@/lib/liveBus';
import { db } from '@/lib/db';
import { canAccessRoom } from '@/lib/live/access';

// Node runtime — we hold an open ReadableStream for the life of the SSE
// connection. Edge runtime on Vercel closes long streams aggressively.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sseFrame(ev: LiveEvent): string {
  // event + data + id so the browser can auto-replay with Last-Event-Id on reconnect.
  return `id: ${ev.id}\nevent: ${ev.event}\ndata: ${JSON.stringify({ room: ev.room, payload: ev.payload })}\n\n`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(req.url);
  const roomsParam = url.searchParams.get('rooms') || '';
  const requested = roomsParam.split(',').map((r) => r.trim()).filter(Boolean);

  // Authorize every requested room server-side. Without this, a client could
  // pass rooms=user:<victimId> to stream another user's DMs in real time, or
  // channel:<privateId> to read private channels it isn't a member of. A client
  // may only subscribe to: its OWN user room, the global broadcast rooms, and
  // channels it can actually access.
  const GLOBAL_ROOMS = new Set(['presence', 'all']);
  const selfRoom = `user:${session.user.id}`;
  const allowed = new Set<string>([selfRoom]);
  const channelIds: string[] = [];
  for (const room of requested) {
    if (room === selfRoom || GLOBAL_ROOMS.has(room)) {
      allowed.add(room);
    } else if (room.startsWith('channel:')) {
      channelIds.push(room.slice('channel:'.length));
    }
    // user:<otherId> and any unrecognized room names are silently dropped.
  }
  if (channelIds.length > 0) {
    const accessibleRooms = await db.room.findMany({
      where: { id: { in: channelIds } },
      select: { id: true, visibility: true, ownerId: true, users: { select: { id: true } } },
    });
    for (const room of accessibleRooms) {
      if (canAccessRoom(room, session.user.id)) allowed.add(`channel:${room.id}`);
    }
  }
  const rooms = Array.from(allowed);

  const encoder = new TextEncoder();
  let closed = false;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // The client went away between the closed check and the enqueue —
          // treat as closed so we stop sending.
          cleanup();
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = null;
        if (unsubscribe) unsubscribe();
        unsubscribe = null;
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      // Initial hello so the client knows the stream is live.
      safeEnqueue(`event: ready\ndata: ${JSON.stringify({ rooms })}\n\n`);

      unsubscribe = subscribe(rooms, (ev) => {
        safeEnqueue(sseFrame(ev));
      });

      // 25s heartbeat — keeps proxies (and browser) from timing out idle streams
      // and gives us an early signal when the client disconnects (enqueue will
      // throw into the cleanup path).
      heartbeatTimer = setInterval(() => {
        safeEnqueue(`: heartbeat\n\n`);
      }, 25000);

      // Abort from client (tab close, navigation).
      req.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      closed = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
