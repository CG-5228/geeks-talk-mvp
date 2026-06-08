type SendEmailParams = {
  subject: string;
  html: string;
  to: string;
  from?: string;
};

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export async function sendEmailResend({ subject, html, to, from }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend disabled: missing RESEND_API_KEY');
    return false;
  }
  const fromAddr = sanitizeHeaderValue(from || process.env.EMAIL_NO_REPLY || 'no-reply@geekstalk.org');
  const toAddr = sanitizeHeaderValue(to);
  const safeSubject = sanitizeHeaderValue(subject).slice(0, 200);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Sending email:', { to: toAddr, from: fromAddr, subject: safeSubject, hasApiKey: !!apiKey });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromAddr, to: toAddr, subject: safeSubject, html }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      console.warn('Resend send failed', res.status, msg);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Resend send error:', error);
    return false;
  }
}

export async function sendEmailWithFallback({ subject, html, to, from }: SendEmailParams): Promise<boolean> {
  // Try Resend first
  const resendResult = await sendEmailResend({ subject, html, to, from });
  if (resendResult) {
    console.log('Email sent successfully via Resend');
    return true;
  }

  // Fallback to nodemailer
  console.log('Resend failed, trying nodemailer fallback...');
  try {
    // Import nodemailer function directly
    const nodemailer = await import('nodemailer');
    
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromAddr = sanitizeHeaderValue(from || process.env.EMAIL_FROM || 'no-reply@geekstalk.org');
    const toAddr = sanitizeHeaderValue(to || process.env.EMAIL_TO || 'Chris.G@geekstalk.org');
    const safeSubject = sanitizeHeaderValue(subject).slice(0, 200);

    if (!host || !user || !pass) {
      console.warn('Nodemailer fallback disabled: missing SMTP envs');
      return false;
    }

    const transporter = nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: fromAddr,
      to: toAddr,
      subject: safeSubject,
      html,
    });

    console.log('Email sent successfully via nodemailer');
    return true;
  } catch (error) {
    console.error('Both email services failed:', error);
    return false;
  }
}

import { __internalEmailKit } from './emailTemplates';

export function renderCodeEmail(code: string) {
  const { renderShell, paragraph, codeBlock, calloutBox } = __internalEmailKit;
  const body = `
    ${paragraph('Hi,')}
    ${paragraph('Use the code below to continue signing in.')}
    ${codeBlock(code, 'brand')}
    ${calloutBox(
      `<strong>Heads up:</strong> this code expires in 10 minutes and can only be used once. If you didn't request it, you can safely ignore this email.`,
      'warning',
    )}
  `;
  return renderShell({
    title: 'Your sign-in code',
    preheader: `Your GeeksTalk verification code is ${code}. Expires in 10 minutes.`,
    eyebrow: 'Verification',
    accent: 'brand',
    body,
  });
}

