import { NextResponse } from 'next/server';
import { verifyEmailCode } from '@/lib/emailCode';
import { hashPassword } from '@/lib/password';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: 'Email, code, and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // Verify the reset code
    const result = await verifyEmailCode(email, code, 'reset');

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the user's password
    await db.user.update({
      where: { email },
      data: { 
        hashedPassword,
        emailVerified: new Date() // Mark email as verified if it wasn't already
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}