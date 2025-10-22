import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { createEmailCode, type EmailCodePurpose } from '@/lib/emailCode';
import { sendEmailWithFallback } from '@/lib/emailResend';
import { renderVerificationEmail } from '@/lib/emailTemplates';

export async function POST(req: Request) {
  try {
    const { email, purpose } = await req.json();

    if (!email || !purpose) {
      return NextResponse.json({ error: 'Email and purpose are required' }, { status: 400 });
    }

    if (!['signup', 'reset', 'change'].includes(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 });
    }

    // Rate limiting
    const rl = rateLimit(`email-code:${email}`);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
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