type SendEmailParams = {
  subject: string;
  html: string;
  to: string;
  from?: string;
};

export async function sendEmailResend({ subject, html, to, from }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('Resend disabled: missing RESEND_API_KEY');
    return;
  }
  const fromAddr = from || process.env.EMAIL_NO_REPLY || 'no-reply@geekstalk.co';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromAddr, to, subject, html }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    console.warn('Resend send failed', res.status, msg);
  }
}

export function renderCodeEmail(code: string) {
  return `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#0d0f10">
      <h2 style="margin:0 0 8px">Your verification code</h2>
      <p style="margin:0 0 12px">Use the code below to continue.</p>
      <div style="font-size:24px;font-weight:700;letter-spacing:4px;background:#0d0f10;color:#00d4ff;display:inline-block;padding:12px 16px;border-radius:8px;">${code}</div>
      <p style="margin:16px 0 0;color:#555">This code expires in 10 minutes. If you didn’t request it, you can ignore this email.</p>
    </div>
  `;
}


