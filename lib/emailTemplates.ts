/**
 * Transactional email templates for GeeksTalk.
 *
 * All templates share a single shell (`renderShell`) built from inline-styled
 * tables for maximum client compatibility (Gmail web/mobile, Apple Mail, Outlook
 * desktop, Outlook.com, Yahoo). The shell supports:
 *
 *  - Preheader text (inbox preview snippet)
 *  - Dark-mode color palette via `prefers-color-scheme`
 *  - Mobile fluid width via a `max-width: 600px` mobile media query
 *  - Bulletproof CTA buttons (padding-based, no VML required)
 *  - HTML-escaping of every interpolated string to prevent injection
 *
 * Accent color varies per template (brand cyan / danger red / warning amber /
 * success emerald) while the layout stays uniform — this creates brand
 * consistency without making every email feel identical.
 */

const BRAND = {
  name: 'GeeksTalk',
  url: process.env.NEXTAUTH_URL || 'https://geekstalk.org',
  supportEmail: process.env.EMAIL_FROM || 'support@geekstalk.org',
};

const COLORS = {
  brand: '#06b6d4',      // cyan-500
  brandDark: '#0891b2',  // cyan-600
  danger: '#ef4444',     // red-500
  warning: '#f59e0b',    // amber-500
  success: '#10b981',    // emerald-500
  ink: '#111827',        // slate-900
  body: '#374151',       // slate-700
  muted: '#6b7280',      // slate-500
  border: '#e5e7eb',     // slate-200
  surface: '#ffffff',
  surfaceMuted: '#f9fafb', // slate-50
  pageBg: '#f3f4f6',     // slate-100
};

type Accent = 'brand' | 'danger' | 'warning' | 'success';

const ACCENT_HEX: Record<Accent, string> = {
  brand: COLORS.brand,
  danger: COLORS.danger,
  warning: COLORS.warning,
  success: COLORS.success,
};

/* ----------------------------- utilities ----------------------------- */

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function paragraph(text: string, { muted = false }: { muted?: boolean } = {}): string {
  const color = muted ? COLORS.muted : COLORS.body;
  return `<p class="${muted ? 'muted' : 'ink'}" style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:${color};">${text}</p>`;
}

function button(label: string, href: string, accent: Accent = 'brand'): string {
  const bg = ACCENT_HEX[accent];
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;">
    <tr>
      <td align="left" style="border-radius:8px;background:${bg};">
        <a href="${escapeHtml(href)}" target="_blank" rel="noopener"
          style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;line-height:1;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function infoGrid(items: Array<{ label: string; value: string; isHtml?: boolean }>): string {
  const rows = items
    .map(
      (item, i) => `
    <tr>
      <td class="divider" style="padding:12px 16px;border-bottom:${i === items.length - 1 ? 'none' : `1px solid ${COLORS.border}`};vertical-align:top;font-size:13px;font-weight:600;color:${COLORS.muted};width:40%;text-transform:uppercase;letter-spacing:0.04em;" class="muted">${escapeHtml(item.label)}</td>
      <td class="divider ink" style="padding:12px 16px;border-bottom:${i === items.length - 1 ? 'none' : `1px solid ${COLORS.border}`};vertical-align:top;font-size:15px;color:${COLORS.ink};word-break:break-word;">${item.isHtml ? item.value : escapeHtml(item.value)}</td>
    </tr>`,
    )
    .join('');
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="background:${COLORS.surfaceMuted};border:1px solid ${COLORS.border};border-radius:10px;margin:8px 0 24px 0;">
    ${rows}
  </table>`;
}

function quoteBlock(text: string, { label, accent = 'brand' }: { label?: string; accent?: Accent } = {}): string {
  const accentHex = ACCENT_HEX[accent];
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="background:${COLORS.surfaceMuted};border:1px solid ${COLORS.border};border-left:3px solid ${accentHex};border-radius:8px;margin:0 0 20px 0;">
    <tr>
      <td style="padding:18px 20px;">
        ${label ? `<div class="muted" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:${COLORS.muted};margin:0 0 10px 0;">${escapeHtml(label)}</div>` : ''}
        <div class="ink" style="font-size:15px;line-height:1.7;color:${COLORS.ink};white-space:normal;">${nl2br(text)}</div>
      </td>
    </tr>
  </table>`;
}

function codeBlock(code: string, accent: Accent = 'brand'): string {
  const accentHex = ACCENT_HEX[accent];
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="code" style="background:${COLORS.surfaceMuted};border:1px dashed ${accentHex}55;border-radius:12px;margin:4px 0 24px 0;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <div class="muted" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:${COLORS.muted};margin:0 0 10px 0;">Verification code</div>
        <div style="font-family:'SF Mono','Menlo','Consolas','Liberation Mono',monospace;font-size:34px;font-weight:700;letter-spacing:0.35em;color:${accentHex};line-height:1;">${escapeHtml(code)}</div>
      </td>
    </tr>
  </table>`;
}

function calloutBox(text: string, accent: Accent = 'warning'): string {
  const accentHex = ACCENT_HEX[accent];
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="callout" style="background:${accentHex}10;border:1px solid ${accentHex}40;border-radius:8px;margin:0 0 20px 0;">
    <tr>
      <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:${COLORS.ink};" class="ink">${text}</td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<hr class="divider" style="border:none;border-top:1px solid ${COLORS.border};margin:24px 0;">`;
}

/* ----------------------------- shell ----------------------------- */

interface ShellOptions {
  title: string;
  preheader: string;
  eyebrow?: string;
  accent?: Accent;
  body: string;
}

function renderShell({ title, preheader, eyebrow, accent = 'brand', body }: ShellOptions): string {
  const accentHex = ACCENT_HEX[accent];
  const year = new Date().getFullYear();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <style type="text/css">
    table, td { font-family: 'Segoe UI', Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body { margin:0 !important; padding:0 !important; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; line-height:100%; outline:none; text-decoration:none; display:block; }
    a { color:${accentHex}; text-decoration:none; }
    a:hover { text-decoration:underline; }

    @media only screen and (max-width: 620px) {
      .container { width:100% !important; max-width:100% !important; border-radius:0 !important; border-left:none !important; border-right:none !important; }
      .p-md { padding-left:22px !important; padding-right:22px !important; }
      .h1 { font-size:22px !important; line-height:1.3 !important; }
    }

    @media (prefers-color-scheme: dark) {
      body, .page-bg { background:#0a0b0d !important; }
      .container { background:#14161a !important; border-color:rgba(255,255,255,0.08) !important; }
      .card { background:#1a1d23 !important; border-color:rgba(255,255,255,0.08) !important; }
      .ink { color:#e7e9ee !important; }
      .heading { color:#ffffff !important; }
      .muted { color:#9aa0ab !important; }
      .divider { border-color:rgba(255,255,255,0.08) !important; }
      .code { background:#0a0b0d !important; }
      .brand-mark { color:#ffffff !important; }
      .callout { background:rgba(255,255,255,0.02) !important; }
    }
  </style>
</head>
<body class="page-bg" style="margin:0;padding:0;background:${COLORS.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;">${escapeHtml(preheader)}</div>
  <div style="display:none;max-height:0;overflow:hidden;">&#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="page-bg" style="background:${COLORS.pageBg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width:600px;width:100%;background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden;">

          <!-- Brand row -->
          <tr>
            <td class="p-md" style="padding:28px 36px 0 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span class="brand-mark heading" style="font-size:16px;font-weight:700;letter-spacing:-0.01em;color:${COLORS.ink};">
                      <span style="display:inline-block;width:10px;height:10px;background:${accentHex};border-radius:3px;vertical-align:middle;margin-right:10px;"></span>${escapeHtml(BRAND.name)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Eyebrow + Title -->
          <tr>
            <td class="p-md" style="padding:28px 36px 0 36px;">
              ${
                eyebrow
                  ? `<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${accentHex};margin:0 0 10px 0;">${escapeHtml(eyebrow)}</div>`
                  : ''
              }
              <h1 class="h1 heading" style="margin:0;font-size:26px;line-height:1.3;font-weight:700;color:${COLORS.ink};letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="p-md" style="padding:24px 36px 8px 36px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="p-md" style="padding:12px 36px 32px 36px;">
              <hr class="divider" style="border:none;border-top:1px solid ${COLORS.border};margin:16px 0 20px 0;">
              <p class="muted" style="margin:0 0 4px 0;font-size:12px;line-height:1.6;color:${COLORS.muted};">
                Sent by ${escapeHtml(BRAND.name)}. If this email wasn't meant for you, you can safely ignore it.
              </p>
              <p class="muted" style="margin:0;font-size:12px;line-height:1.6;color:${COLORS.muted};">
                © ${year} ${escapeHtml(BRAND.name)} &middot;
                <a href="${escapeHtml(BRAND.url)}" style="color:${COLORS.muted};text-decoration:underline;">geekstalk.org</a>
                &middot;
                <a href="mailto:${escapeHtml(BRAND.supportEmail)}" style="color:${COLORS.muted};text-decoration:underline;">${escapeHtml(BRAND.supportEmail)}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ----------------------------- templates ----------------------------- */

export function renderVerificationEmail(
  email: string,
  code: string,
  purpose: 'signup' | 'reset' | 'change',
): string {
  const meta = {
    signup: {
      eyebrow: 'Verify your email',
      title: 'Confirm your email to finish signing up',
      preheader: `Your GeeksTalk verification code is ${code}. Expires in 15 minutes.`,
      intro: 'Welcome to GeeksTalk. Enter the code below in the verification form to activate your account.',
    },
    reset: {
      eyebrow: 'Password reset',
      title: 'Reset your GeeksTalk password',
      preheader: `Your password reset code is ${code}. Expires in 30 minutes.`,
      intro: 'You requested to reset your password. Enter this code along with your new password to continue.',
    },
    change: {
      eyebrow: 'Confirm new email',
      title: 'Confirm your new email address',
      preheader: `Your email-change code is ${code}. Expires in 10 minutes.`,
      intro: 'You requested to change the email address on your GeeksTalk account. Enter this code to confirm the new address.',
    },
  }[purpose];

  const body = `
    ${paragraph(`Hi,`)}
    ${paragraph(meta.intro)}
    ${codeBlock(code, 'brand')}
    ${calloutBox(
      `<strong style="color:${COLORS.ink};">Heads up:</strong> this code expires soon and can only be used once. If you didn't request it, you can ignore this email &mdash; your account stays safe.`,
      'warning',
    )}
    ${paragraph(`Requested for <strong>${escapeHtml(email)}</strong>.`, { muted: true })}
  `;

  return renderShell({
    title: meta.title,
    preheader: meta.preheader,
    eyebrow: meta.eyebrow,
    accent: 'brand',
    body,
  });
}

export function renderBugReplyEmail({
  reporterName,
  bugTitle,
  adminName,
  replyMessage,
}: {
  reporterName: string;
  bugTitle: string;
  adminName: string;
  replyMessage: string;
}): string {
  const body = `
    ${paragraph(`Hi ${escapeHtml(reporterName)},`)}
    ${paragraph(
      `Thanks for the bug report. <strong>${escapeHtml(adminName)}</strong> from the GeeksTalk team just replied:`,
    )}
    ${quoteBlock(replyMessage, { label: `Reply from ${adminName}`, accent: 'brand' })}
    ${paragraph(`Referring to:`, { muted: true })}
    ${quoteBlock(bugTitle, { label: 'Bug report', accent: 'brand' })}
    ${paragraph(
      `If you have more details to share, just reply to this email and it'll land back in our triage queue.`,
    )}
    ${button('Open GeeksTalk', BRAND.url, 'brand')}
  `;

  return renderShell({
    title: 'We replied to your bug report',
    preheader: `${adminName} replied to your bug: ${bugTitle}`,
    eyebrow: 'Bug report update',
    accent: 'brand',
    body,
  });
}

export function renderBanEmail(
  userName: string,
  reason: string,
  days: number,
  expiresAt: Date,
): string {
  const expiresStr = expiresAt.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const body = `
    ${paragraph(`Hi ${escapeHtml(userName)},`)}
    ${paragraph(
      `Your GeeksTalk account has been temporarily suspended following a review of activity that violated our community guidelines.`,
    )}
    ${infoGrid([
      { label: 'Reason', value: reason },
      { label: 'Duration', value: `${days} day${days === 1 ? '' : 's'}` },
      { label: 'Access restored', value: expiresStr },
    ])}
    ${paragraph(
      `During this period you won't be able to sign in or participate in channels, voice rooms, or DMs. Your account and data remain intact.`,
    )}
    ${paragraph(
      `If you believe this decision was made in error, reply to this email and our moderation team will take a second look.`,
    )}
    ${button('Contact support', `mailto:${BRAND.supportEmail}?subject=Appeal%20account%20suspension`, 'danger')}
    ${paragraph(
      `We hope to see you back as an active member of the community soon.`,
      { muted: true },
    )}
  `;

  return renderShell({
    title: 'Your account has been suspended',
    preheader: `Access restored ${expiresStr}. Reason: ${reason.slice(0, 80)}`,
    eyebrow: 'Account suspension',
    accent: 'danger',
    body,
  });
}

export function renderAdminMessageEmail(
  userName: string,
  subject: string,
  message: string,
): string {
  const body = `
    ${paragraph(`Hi ${escapeHtml(userName)},`)}
    ${paragraph(`The GeeksTalk team sent you a message:`)}
    ${quoteBlock(message, { label: subject, accent: 'brand' })}
    ${paragraph(`You can also read this in your notification inbox on GeeksTalk.`)}
    ${button('Open inbox', `${BRAND.url}/notifications`, 'brand')}
  `;

  return renderShell({
    title: subject || 'Message from GeeksTalk',
    preheader: `${subject}: ${message.slice(0, 90).replace(/\n/g, ' ')}`,
    eyebrow: 'Message from the team',
    accent: 'brand',
    body,
  });
}

export function renderContactReplyEmail(
  userName: string,
  originalMessage: string,
  reply: string,
): string {
  const body = `
    ${paragraph(`Hi ${escapeHtml(userName)},`)}
    ${paragraph(`Thanks for reaching out. Here's our reply:`)}
    ${quoteBlock(reply, { label: 'Our reply', accent: 'brand' })}
    ${paragraph(`For context, your original message:`, { muted: true })}
    ${quoteBlock(originalMessage, { label: 'Your message', accent: 'brand' })}
    ${paragraph(`If anything's still unclear, just reply to this email.`)}
    ${button('Open GeeksTalk', BRAND.url, 'brand')}
  `;

  return renderShell({
    title: 'We got back to you',
    preheader: `Reply: ${reply.slice(0, 90).replace(/\n/g, ' ')}`,
    eyebrow: 'Support reply',
    accent: 'brand',
    body,
  });
}

export function renderUserReportEmail({
  adminName,
  reporterName,
  reportedUserName,
  category,
  reason,
  description,
  reportId,
  timestamp,
  attachments,
}: {
  adminName: string;
  reporterName: string;
  reportedUserName: string;
  category: string;
  reason: string;
  description: string;
  reportId: string;
  timestamp: string;
  attachments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  }>;
}): string {
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  const ts = new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const categoryPill = `<span style="display:inline-block;padding:3px 10px;background:${COLORS.warning}18;border:1px solid ${COLORS.warning}55;border-radius:999px;font-size:12px;font-weight:600;color:${COLORS.warning};text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(categoryLabel)}</span>`;

  const grid = infoGrid([
    { label: 'Reporter', value: reporterName },
    { label: 'Reported user', value: reportedUserName },
    { label: 'Category', value: categoryPill, isHtml: true },
    { label: 'Primary reason', value: reason },
    { label: 'Report ID', value: reportId },
    { label: 'Submitted', value: ts },
  ]);

  const attachmentsBlock =
    attachments && attachments.length > 0
      ? `
    ${paragraph(`Evidence (${attachments.length}):`, { muted: true })}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="background:${COLORS.surfaceMuted};border:1px solid ${COLORS.border};border-radius:10px;margin:0 0 20px 0;">
      ${attachments
        .map(
          (a, i) => `
        <tr>
          <td class="divider" style="padding:12px 16px;border-bottom:${i === attachments.length - 1 ? 'none' : `1px solid ${COLORS.border}`};font-size:14px;color:${COLORS.ink};" class="ink">
            <a href="${escapeHtml(BRAND.url)}/api/admin/reports/attachments/${escapeHtml(a.id)}/view" target="_blank" rel="noopener" style="color:${COLORS.brand};text-decoration:none;font-weight:600;">${escapeHtml(a.fileName)}</a>
            <span class="muted" style="color:${COLORS.muted};font-size:12px;margin-left:10px;">${Math.round(a.fileSize / 1024)} KB &middot; ${escapeHtml(a.fileType)}</span>
          </td>
        </tr>`,
        )
        .join('')}
    </table>
  `
      : '';

  const descriptionBlock = description
    ? quoteBlock(description, { label: 'Additional context', accent: 'warning' })
    : '';

  const body = `
    ${paragraph(`Hi ${escapeHtml(adminName)},`)}
    ${paragraph(`A new user report needs moderator review.`)}
    ${grid}
    ${descriptionBlock}
    ${attachmentsBlock}
    ${button('Review in admin console', `${BRAND.url}/admin`, 'warning')}
    ${paragraph(`This notification is generated automatically by the GeeksTalk moderation system.`, { muted: true })}
  `;

  return renderShell({
    title: 'New user report awaiting review',
    preheader: `${reporterName} reported ${reportedUserName} (${categoryLabel}) — ${reason.slice(0, 80)}`,
    eyebrow: 'Moderation queue',
    accent: 'warning',
    body,
  });
}

/* ----------------------------- shell export ----------------------------- */

export const __internalEmailKit = { renderShell, paragraph, codeBlock, calloutBox, button, quoteBlock, infoGrid, divider, escapeHtml };
