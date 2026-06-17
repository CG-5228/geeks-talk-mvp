import { NextResponse } from 'next/server';
import { verifyEmailCode, type EmailCodePurpose } from '@/lib/emailCode';
import { rateLimit } from '@/lib/rateLimit';
import { db } from '@/lib/db';

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0]?.trim() || 'local';
}

export async function POST(req: Request) {
  try {
    const { email, code, purpose } = await req.json();

    if (!email || !code || !purpose) {
      return NextResponse.json({ error: 'Email, code, and purpose are required' }, { status: 400 });
    }

    if (!['signup', 'reset', 'change'].includes(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const ip = getClientIp(req);

    // Bound brute force of the verification code (per-email+purpose and per-IP).
    const rlEmail = await rateLimit(`verify:${normalizedEmail}:${purpose}`, 10, 60_000);
    const rlIp = await rateLimit(`verify-ip:${ip}`, 30, 60_000);
    if (!rlEmail.allowed || !rlIp.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    // Verify the code
    const result = await verifyEmailCode(normalizedEmail, code, purpose as EmailCodePurpose);

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Handle different purposes
    if (purpose === 'signup') {
      // Mark email as verified for the user
      if (result.userId) {
        await db.user.update({
          where: { id: result.userId },
          data: { emailVerified: new Date() }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Code verified successfully',
      userId: result.userId
    });

  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}