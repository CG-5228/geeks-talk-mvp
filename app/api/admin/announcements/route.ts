import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emitAnnouncementUpdate } from '@/lib/announcementEvents';
import { logAdminAction } from '@/lib/adminAudit';
import { requireAdmin, requireSuperAdmin } from '@/lib/adminGate';

function normalizeScope(scopeParam: string | null): 'MAIN' | 'LIVE' {
  if (!scopeParam) return 'MAIN';
  return scopeParam.toLowerCase() === 'live' ? 'LIVE' : 'MAIN';
}

export async function GET(req: Request) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const scope = normalizeScope(searchParams.get('scope'));

    const announcement = await db.siteAnnouncement.findFirst({
      where: { scope },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { dismissals: true } } },
    });

    return NextResponse.json({ announcement });
  } catch (error: any) {
    console.error('Error in GET /api/admin/announcements:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', announcement: null },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const scope = normalizeScope(body.scope);
    const {
      message,
      variant = 'warning',
      behavior = 'PERSISTENT',
      durationMs,
      isActive = true,
      resetDismissals = false,
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const behaviorEnum = behavior === 'TIMED' ? 'TIMED' : 'PERSISTENT';

    let existing = await db.siteAnnouncement.findFirst({
      where: { scope },
      orderBy: { updatedAt: 'desc' },
    });

    if (!existing) {
      existing = await db.siteAnnouncement.create({
        data: {
          scope,
          message,
          variant,
          behavior: behaviorEnum,
          durationMs: behaviorEnum === 'TIMED' ? (durationMs ?? 5000) : null,
          isActive: isActive ?? true, // Default to true if not specified
        },
      });
    } else {
      const updateData: any = {
        message,
        variant,
        behavior: behaviorEnum,
        durationMs: behaviorEnum === 'TIMED' ? (durationMs ?? 5000) : null,
        isActive: isActive ?? true, // Default to true if not specified
      };

      // Decide if we should reset dismissals:
      // - Explicit admin request (resetDismissals)
      // - OR any meaningful content change (message / variant / behavior / duration / active state)
      //   so that a *new* banner always shows again even for users who dismissed the old one.
      const normalizedDuration =
        behaviorEnum === 'TIMED' ? (durationMs ?? 5000) : null;

      const contentChanged =
        existing.message !== message ||
        existing.variant !== variant ||
        existing.behavior !== behaviorEnum ||
        existing.durationMs !== normalizedDuration ||
        existing.isActive !== isActive;

      const shouldResetDismissals = resetDismissals || contentChanged;

      // Bump dismissKey so clients treat it as a new banner
      // Generate a new dismissKey (cuid-like format: c + 24 alphanumeric chars)
      if (shouldResetDismissals) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        const randomPart = Array.from({ length: 24 }, () => 
          chars[Math.floor(Math.random() * chars.length)]
        ).join('');
        updateData.dismissKey = `c${randomPart}`;
      }

      existing = await db.siteAnnouncement.update({
        where: { id: existing.id },
        data: updateData,
      });

      if (shouldResetDismissals) {
        await db.announcementDismissal.deleteMany({
          where: { announcementId: existing.id },
        });
      }
    }

    // Emit update event for real-time updates
    console.log(`[Admin API] Emitting announcement update for scope: ${scope}, announcement ID: ${existing.id}, dismissKey: ${existing.dismissKey}`);
    emitAnnouncementUpdate(scope);
    console.log(`[Admin API] Update event emitted for scope: ${scope}`);

    await logAdminAction({
      adminId: gate.userId,
      action: 'banner.save',
      targetType: 'announcement',
      targetId: existing.id,
      summary: `${scope}: ${message.slice(0, 80)}`,
      metadata: { scope, variant, behavior: behaviorEnum, isActive, durationMs: existing.durationMs },
      req,
    });

    return NextResponse.json({ announcement: existing });
  } catch (error: any) {
    console.error('Error in POST /api/admin/announcements:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const scope = normalizeScope(searchParams.get('scope'));

    const announcement = await db.siteAnnouncement.findFirst({
      where: { scope },
      orderBy: { updatedAt: 'desc' },
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Delete the announcement and all its dismissals (cascade)
    await db.siteAnnouncement.delete({
      where: { id: announcement.id },
    });

    // Emit update event for real-time updates
    console.log(`[Admin API] Emitting announcement update after deletion for scope: ${scope}`);
    emitAnnouncementUpdate(scope);

    await logAdminAction({
      adminId: gate.userId,
      action: 'banner.delete',
      targetType: 'announcement',
      targetId: announcement.id,
      summary: `${scope}: ${announcement.message.slice(0, 80)}`,
      metadata: { scope, variant: announcement.variant },
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/announcements:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return gate.response;

    const body = await req.json();
    const scope = normalizeScope(body.scope);
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
    }

    const announcement = await db.siteAnnouncement.findFirst({
      where: { scope },
      orderBy: { updatedAt: 'desc' },
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    const updated = await db.siteAnnouncement.update({
      where: { id: announcement.id },
      data: { isActive },
    });

    // Emit update event for real-time updates
    console.log(`[Admin API] Emitting announcement update after toggle for scope: ${scope}, isActive: ${isActive}`);
    emitAnnouncementUpdate(scope);

    await logAdminAction({
      adminId: gate.userId,
      action: 'banner.toggle',
      targetType: 'announcement',
      targetId: updated.id,
      summary: `${scope}: ${isActive ? 'enabled' : 'disabled'}`,
      metadata: { scope, isActive },
      req,
    });

    return NextResponse.json({ announcement: updated });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/announcements:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
