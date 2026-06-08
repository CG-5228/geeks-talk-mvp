'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

export default function EmailChangeCard({
  currentEmail,
  emailVerified,
}: {
  currentEmail: string | null;
  emailVerified: boolean;
}) {
  const [step, setStep] = useState<'idle' | 'code'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [shownEmail, setShownEmail] = useState(currentEmail || '');

  async function request() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/user/email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      setStep('code');
      setMsg({ type: 'success', text: `Code sent to ${newEmail}. Expires in 10 minutes.` });
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/user/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, code }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Invalid code');
      setShownEmail(d.email || newEmail);
      setStep('idle');
      setNewEmail('');
      setCode('');
      setMsg({ type: 'success', text: 'Email updated.' });
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Invalid code' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/20 bg-card/30 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{shownEmail || '—'}</div>
          <div className="text-xs text-muted-foreground">
            {emailVerified ? 'Verified' : 'Unverified'}
          </div>
        </div>
      </div>

      {step === 'idle' ? (
        <div className="space-y-2">
          <label className="block text-xs text-muted-foreground">Change email</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@email.com"
              className="flex-1 rounded-lg px-3 py-2 bg-background/40 border border-border/20 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={request}
              disabled={busy || !newEmail}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs text-muted-foreground">
            Enter the code we sent to {newEmail}
          </label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              inputMode="numeric"
              placeholder="123456"
              className="flex-1 rounded-lg px-3 py-2 bg-background/40 border border-border/20 text-foreground text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
            <button
              onClick={verify}
              disabled={busy || code.length < 4}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {busy ? 'Confirming…' : 'Confirm'}
            </button>
            <button
              onClick={() => {
                setStep('idle');
                setCode('');
              }}
              className="px-3 py-2 rounded-lg border border-border/20 text-muted-foreground hover:text-foreground text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div
          role="status"
          className={`text-xs ${msg.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
