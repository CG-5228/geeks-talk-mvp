import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { getAdminRole, type AdminRole } from './admin';

type GateResult =
  | { ok: true; userId: string; role: AdminRole }
  | { ok: false; response: NextResponse };

/**
 * Admin-only gate. Returns the admin's role so handlers can branch on it
 * without a second DB query. Emits standard 401/403 responses otherwise.
 */
export async function requireAdmin(): Promise<GateResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const role = await getAdminRole(session.user.id);
  if (!role) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, userId: session.user.id, role };
}

/**
 * Super-admin-only gate. Use for destructive/config endpoints: admin grant/revoke,
 * feature flags write, broadcast, banner, blog/tutorial delete, DB/files admin.
 */
export async function requireSuperAdmin(): Promise<GateResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;
  if (gate.role !== 'super-admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Super admin required' },
        { status: 403 },
      ),
    };
  }
  return gate;
}
