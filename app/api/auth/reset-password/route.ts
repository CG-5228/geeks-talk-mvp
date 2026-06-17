import { NextResponse } from 'next/server';
import { verifyEmailCode } from '@/lib/emailCode';
import { hashPassword } from '@/lib/password';
import { rateLimit } from '@/lib/rateLimit';
import { db } from '@/lib/db';

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0]?.trim() || 'local';
}

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, code, and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const ip = getClientIp(req);

    // Bound brute force of the 6-digit reset code (per-email and per-IP). The
    // per-code attempt counter is the primary defense; this caps total volume.
    const rlEmail = await rateLimit(`reset:${normalizedEmail}`, 10, 60_000);
    const rlIp = await rateLimit(`reset-ip:${ip}`, 30, 60_000);
    if (!rlEmail.allowed || !rlIp.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    // Verify the reset code
    const result = await verifyEmailCode(normalizedEmail, code, 'reset');

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Resolve the account case-insensitively so a stored mixed-case email still
    // matches the normalized address the code was issued against.
    const user = await db.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // Hash and set the new password.
    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        emailVerified: new Date(), // Mark email as verified if it wasn't already
      },
    });

    // Invalidate any other outstanding reset codes for this email so a second
    // valid code can't be replayed after the password has changed.
    await db.emailCode.updateMany({
      where: { email: normalizedEmail, purpose: 'reset', consumedAt: null },
      data: { consumedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
