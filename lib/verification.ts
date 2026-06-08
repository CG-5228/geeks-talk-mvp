// Email verification codes are handled exclusively by lib/emailCode.ts
// (SHA-256, constant-time compare, attempt lockout). The previous bcrypt-based
// create/verify helpers here diverged from that storage format and caused
// signup/change codes to never validate, so they were removed. Only the
// allowed-domain check remains.
export function isAllowedEmailDomain(email: string) {
  const allowed = ['icloud.com', 'gmail.com', 'outlook.com', 'yahoo.com', 'qq.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  return !!domain && allowed.includes(domain);
}
