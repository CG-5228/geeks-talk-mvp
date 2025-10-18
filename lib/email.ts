import nodemailer from 'nodemailer';

type SendEmailParams = {
  subject: string;
  html: string;
  to?: string;
  from?: string;
};

export async function sendEmail({ subject, html, to, from }: SendEmailParams) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromAddr = from || process.env.EMAIL_FROM || 'no-reply@geekstalk.co';
  const toAddr = to || process.env.EMAIL_TO || 'chris.g@geekstalk.co';

  if (!host || !user || !pass) {
    console.warn('Email disabled: missing SMTP envs');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: fromAddr,
    to: toAddr,
    subject,
    html,
  });
}


