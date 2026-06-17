'use client';

import { useState } from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';

export default function TwoFactorSetup({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const [step, setStep] = useState<'idle' | 'setup' | 'verify' | 'backup'>('idle');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/user/2fa/setup', { method: 'POST' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Setup failed');
      setSecret(d.secret);
      setOtpauthUrl(d.otpauthUrl);
      setStep('setup');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/user/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Invalid code');
      setBackupCodes(d.backupCodes || []);
      setStep('backup');
      onChange(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Verification failed');
      onChange(false);
      setDisableCode('');
      setStep('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  async function copyBackup() {
    await navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const qrSrc = otpauthUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUrl)}`
    : '';

  if (enabled && step === 'idle') {
    return (
      <div className="rounded-xl border border-border/20 bg-card/30 p-5 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-medium">Two-factor authentication is on.</span>
        </div>
        <p className="text-xs text-muted-foreground">
          You&apos;ll be asked for a code from your authenticator app whenever you sign in on a new device.
        </p>
        <div className="pt-2">
          <label className="block text-xs text-muted-foreground mb-1">
            Enter your 6-digit code or backup code to disable
          </label>
          <div className="flex gap-2">
            <input
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              className="flex-1 rounded-lg px-3 py-2 bg-card/30 border border-border/20 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="123456"
            />
            <button
              onClick={disable}
              disabled={busy || !disableCode}
              className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition text-sm disabled:opacity-50"
            >
              {busy ? 'Disabling…' : 'Disable 2FA'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    );
  }

  if (step === 'idle') {
    return (
      <div>
        <button
          onClick={startSetup}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          {busy ? 'Preparing…' : 'Enable two-factor auth'}
        </button>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  if (step === 'setup' || step === 'verify') {
    return (
      <div className="rounded-xl border border-border/20 bg-card/30 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {qrSrc && (
            <img
              src={qrSrc}
              alt="2FA QR code"
              className="h-44 w-44 rounded-lg bg-white p-2 flex-shrink-0"
            />
          )}
          <div className="min-w-0 space-y-2">
            <p className="text-sm text-foreground">
              Scan this QR in your authenticator (1Password, Authy, Google Authenticator).
            </p>
            <div className="text-xs text-muted-foreground">Or enter manually:</div>
            <code className="inline-block px-2 py-1 rounded bg-background/60 text-xs font-mono break-all">
              {secret}
            </code>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Enter the 6-digit code to confirm
          </label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="flex-1 rounded-lg px-3 py-2 bg-card/30 border border-border/20 text-foreground text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="123456"
              inputMode="numeric"
              autoFocus
            />
            <button
              onClick={verify}
              disabled={busy || code.length !== 6}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {busy ? 'Verifying…' : 'Verify'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-medium">2FA is now active.</span>
        </div>
        <p className="text-sm text-foreground">
          Save these backup codes somewhere safe. Each works once if you lose your device.
        </p>
        <div className="grid grid-cols-2 gap-2 font-mono text-sm text-foreground bg-background/40 rounded-lg p-3 border border-border/20">
          {backupCodes.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyBackup}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-card/40 border border-border/20 text-sm text-foreground hover:bg-card/60 transition"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy all'}
          </button>
          <button
            onClick={() => setStep('idle')}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}
