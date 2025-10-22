import { NextResponse } from 'next/server';
import { verifyEmailCode, type EmailCodePurpose } from '@/lib/emailCode';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, code, purpose } = await req.json();

    if (!email || !code || !purpose) {
      return NextResponse.json({ error: 'Email, code, and purpose are required' }, { status: 400 });
    }

    if (!['signup', 'reset', 'change'].includes(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 });
    }

    // Verify the code
    const result = await verifyEmailCode(email, code, purpose as EmailCodePurpose);

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