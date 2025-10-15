"use client";
import { useState } from 'react';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrent] = useState('');
  const [nextPassword, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null); setErr(null);
    if (nextPassword !== confirm) { setErr('Passwords do not match'); return; }
    setPending(true);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword: nextPassword })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setMsg('Password updated'); else setErr(data.error || 'Failed');
    setPending(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h2 className="text-lg font-semibold text-[rgba(236,245,255,0.95)]">Change password</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        <input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" className="rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20" />
        <input type="password" value={nextPassword} onChange={(e) => setNext(e.target.value)} placeholder="New password" className="rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20" />
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" className="rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20" />
      </div>
      <button className="btn-primary rounded-md px-4 py-2" disabled={pending}>Update password</button>
      {msg && <div className="text-green-400 text-sm">{msg}</div>}
      {err && <div className="text-red-400 text-sm">{err}</div>}
    </form>
  );
}
