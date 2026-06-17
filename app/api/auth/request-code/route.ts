import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { rateLimit } from '@/lib/rateLimit';
import { createEmailCode, type EmailCodePurpose } from '@/lib/emailCode';
import { sendEmailWithFallback } from '@/lib/emailResend';
import { renderVerificationEmail } from '@/lib/emailTemplates';
import { authOptions } from '@/lib/auth';
import { isAllowedEmailDomain } from '@/lib/verification';
import { db } from '@/lib/db';
import { z } from 'zod';

const RequestCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  purpose: z.enum(['signup', 'reset', 'change']),
});

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0]?.trim() || 'local';
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = RequestCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }
    const { email, purpose } = parsed.data;
    const ip = getClientIp(req);

    // Rate limiting by email and IP.
    const rl = await rateLimit(`email-code:${email}`);
    const rlByIp = await rateLimit(`email-code-ip:${ip}`, 20, 60_000);
    if (!rl.allowed || !rlByIp.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    if (purpose === 'signup' && !isAllowedEmailDomain(email)) {
      return NextResponse.json({ error: 'Email provider not supported' }, { status: 400 });
    }

    if (purpose === 'change') {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id || !session.user.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (session.user.email.toLowerCase() !== email) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (purpose === 'reset') {
      const user = await db.user.findUnique({
        where: { email },
        select: { id: true }
      });
      // Avoid user enumeration by returning a generic success response.
      if (!user) {
        return NextResponse.json({
          success: true,
          message: 'If the email exists, a verification code has been sent.'
        });
      }
    }

    // Generate and store the code
    const { code, expiresAt } = await createEmailCode(email, purpose as EmailCodePurpose);

    // Send email
    const emailHtml = renderVerificationEmail(email, code, purpose as EmailCodePurpose);
    
    try {
      const emailSent = await sendEmailWithFallback({
        to: email,
        subject: getEmailSubject(purpose as EmailCodePurpose),
        html: emailHtml
      });
      
      if (!emailSent) {
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent to your email',
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error requesting verification code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getEmailSubject(purpose: EmailCodePurpose): string {
  switch (purpose) {
    case 'signup':
      return 'Verify your email address - Geeks Talk';
    case 'reset':
      return 'Reset your password - Geeks Talk';
    case 'change':
      return 'Verify email change - Geeks Talk';
    default:
      return 'Verification code - Geeks Talk';
  }
}
