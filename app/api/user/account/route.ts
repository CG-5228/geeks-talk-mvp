import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        hashedPassword: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // First, try to find Google account linked to this user
    let googleAccount = await db.account.findFirst({
      where: {
        userId,
        provider: 'google',
      },
    });

    // If not found and user has no password, they likely signed in with Google
    // Try to find any Google account with matching email (in case userId mismatch)
    if (!googleAccount && !user.hashedPassword && user.email) {
      // Find user by email who has Google account
      const userWithGoogle = await db.user.findUnique({
        where: { email: user.email },
        include: {
          accounts: {
            where: { provider: 'google' },
          },
        },
      });
      if (userWithGoogle?.accounts?.[0]) {
        // If found, update the account to link to current userId
        googleAccount = await db.account.update({
          where: { id: userWithGoogle.accounts[0].id },
          data: { userId },
        });
      }
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Account info for user:', {
        userId,
        email: user.email,
        hasPassword: !!user.hashedPassword,
        googleAccountExists: !!googleAccount,
        googleAccountId: googleAccount?.id,
        googleProviderAccountId: googleAccount?.providerAccountId,
      });
    }

    return NextResponse.json({
      hasPassword: !!user.hashedPassword,
      googleLinked: !!googleAccount,
      googleEmail: googleAccount ? user.email : null,
    });
  } catch (error) {
    console.error('Error in /api/user/account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

