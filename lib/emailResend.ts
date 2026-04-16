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
  const fromAddr = sanitizeHeaderValue(from || process.env.EMAIL_NO_REPLY || 'no-reply@geekstalk.co');
  const toAddr = sanitizeHeaderValue(to);
  const safeSubject = sanitizeHeaderValue(subject).slice(0, 200);
  
  console.log('Sending email:', { to: toAddr, from: fromAddr, subject: safeSubject, hasApiKey: !!apiKey });

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
    const fromAddr = sanitizeHeaderValue(from || process.env.EMAIL_FROM || 'no-reply@geekstalk.co');
    const toAddr = sanitizeHeaderValue(to || process.env.EMAIL_TO || 'chris.g@geekstalk.co');
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

export function renderCodeEmail(code: string) {
  return `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#0d0f10">
      <h2 style="margin:0 0 8px">Your verification code</h2>
      <p style="margin:0 0 12px">Use the code below to continue.</p>
      <div style="font-size:24px;font-weight:700;letter-spacing:4px;background:#0d0f10;color:#00d4ff;display:inline-block;padding:12px 16px;border-radius:8px;">${code}</div>
      <p style="margin:16px 0 0;color:#555">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
    </div>
  `;
}

