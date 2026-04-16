import nodemailer from 'nodemailer';

type SendEmailParams = {
  subject: string;
  html: string;
  to?: string;
  from?: string;
};

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export async function sendEmail({ subject, html, to, from }: SendEmailParams): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromAddr = sanitizeHeaderValue(from || process.env.EMAIL_FROM || 'no-reply@geekstalk.co');
  const toAddr = sanitizeHeaderValue(to || process.env.EMAIL_TO || 'chris.g@geekstalk.co');
  const safeSubject = sanitizeHeaderValue(subject).slice(0, 200);

  if (!host || !user || !pass) {
    console.warn('Email disabled: missing SMTP envs');
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
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

    return true;
  } catch (error) {
    console.error('Nodemailer send failed:', error);
    return false;
  }
}

