import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  addAnnouncementListener,
  type AnnouncementScope,
} from '@/lib/announcementEvents';

function normalizeScope(scopeParam: string | null): AnnouncementScope {
  if (!scopeParam) return 'MAIN';
  return scopeParam.toLowerCase() === 'live' ? 'LIVE' : 'MAIN';
}

async function getCurrentAnnouncement(
  req: Request,
  scope: AnnouncementScope
): Promise<any> {
  const session = await getServerSession(authOptions);

  // #region agent log
  console.log(`[SSE] getCurrentAnnouncement called for scope: ${scope}`);
  // #endregion

  const announcement = await db.siteAnnouncement.findFirst({
    where: { scope, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  // #region agent log
  console.log(`[SSE] Database query result for scope ${scope}:`, {
    found: !!announcement,
    id: announcement?.id,
    isActive: announcement?.isActive,
    message: announcement?.message?.substring(0, 50),
  });
  // #endregion

  if (!announcement) {
    return { announcement: null };
  }

  // Check DB dismissal for logged-in user
  let dismissed = false;
  if (session?.user?.id) {
    const dismissal = await db.announcementDismissal.findFirst({
      where: {
        userId: session.user.id,
        announcementId: announcement.id,
      },
    });
    dismissed = !!dismissal;
  }

  // #region agent log
  console.log(`[SSE] Final result for scope ${scope}:`, {
    hasAnnouncement: !dismissed,
    dismissed,
    userId: session?.user?.id || 'guest',
  });
  // #endregion

  return {
    announcement: dismissed
      ? null
      : {
          id: announcement.id,
          scope: announcement.scope,
          message: announcement.message,
          variant: announcement.variant,
          behavior: announcement.behavior,
          durationMs: announcement.durationMs,
          dismissKey: announcement.dismissKey,
          updatedAt: announcement.updatedAt,
        },
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scopeParam = searchParams.get('scope');
  const scope = normalizeScope(scopeParam);

  // #region agent log
  console.log(`[SSE] GET /api/announcements/realtime called with scope param: "${scopeParam}", normalized: "${scope}"`);
  // #endregion

  try {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let closed = false;

        const sendData = async () => {
          if (closed) {
            console.log(`[SSE] Stream closed, not sending data for scope: ${scope}`);
            return;
          }
          try {
            console.log(`[SSE] Fetching current announcement for scope: ${scope}`);
            const payload = await getCurrentAnnouncement(req, scope);
            const data = {
              scope,
              ...payload,
            };
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
            console.log(`[SSE] Sent announcement data for scope ${scope}:`, {
              hasAnnouncement: !!data.announcement,
              id: data.announcement?.id,
              dismissKey: data.announcement?.dismissKey,
            });
          } catch (error) {
            console.error('Error sending announcement SSE data:', error);
          }
        };

        // Initial send
        sendData();

        // Listen for updates
        const unsubscribe = addAnnouncementListener((updatedScope) => {
          console.log(`[SSE] Received update event for scope: ${updatedScope}, current scope: ${scope}`);
          if (updatedScope === scope) {
            console.log(`[SSE] Scopes match, sending updated data for scope: ${scope}`);
            sendData();
          } else {
            console.log(`[SSE] Scope mismatch, ignoring update (${updatedScope} !== ${scope})`);
          }
        });

        // Optional heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(':\n\n'));
          } catch {
            // Ignore
          }
        }, 25000);

        // Cleanup on close
        const close = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // Ignore
          }
        };

        // Abort signal from client
        req.signal?.addEventListener('abort', close);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/announcements/realtime:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

