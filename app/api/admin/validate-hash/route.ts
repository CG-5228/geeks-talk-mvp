import { NextResponse } from 'next/server';
import { validateSessionAdminHash } from '@/lib/adminSession';
import { isAdmin } from '@/lib/admin';

/**
 * API endpoint to validate a session-based admin hash
 * Used by the admin layout to verify access
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hash = searchParams.get('hash');
  
  if (!hash) {
    return NextResponse.json({ error: 'Hash required' }, { status: 400 });
  }
  
  const userId = validateSessionAdminHash(hash);
  
  if (!userId) {
    return NextResponse.json({ 
      valid: false,
      error: 'Invalid or expired hash' 
    }, { status: 401 });
  }
  
  // Double-check that the user is still an admin
  const stillAdmin = await isAdmin(userId);
  if (!stillAdmin) {
    return NextResponse.json({ 
      valid: false,
      error: 'User is no longer an admin' 
    }, { status: 403 });
  }
  
  return NextResponse.json({ 
    valid: true,
    userId 
  });
}
