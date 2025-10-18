"use client";
import { useEffect, useState } from 'react';
import NeonAuthShell from '@/components/auth/NeonAuthShell';
import ParticlesBackground from '@/components/auth/ParticlesBackground';

export default function ResetPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [codePending, setCodePending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (cooldown<=0) return; const id=setInterval(()=>setCooldown(c=>c-1),1000); return ()=>clearInterval(id); }, [cooldown]);

  const requestCode = async () => {
    setCodePending(true); setErr(null); setMsg(null);
    try {
      const r = await fetch('/api/auth/request-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, purpose: 'reset' }) });
      if (!r.ok) { const d=await r.json().catch(()=>({})); setErr(d.error||'Failed to send code'); }
      else setCooldown(60);
    } finally { setCodePending(false); }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setMsg(null);
    if (password !== confirm) { setErr('Passwords do not match'); return; }
    setPending(true);
    try {
      const r = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code, newPassword: password }) });
      const d = await r.json().catch(()=>({}));
      if (!r.ok) setErr(d.error||'Failed'); else setMsg('Password reset. You can sign in now.');
    } finally { setPending(false); }
  };

  return (
    <div className="relative overflow-visible">
      <ParticlesBackground />
      <NeonAuthShell title="Reset password" subtitle="We will email you a verification code.">
        <form onSubmit={onSubmit} className="space-y-4">
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20" />
          <div className="flex gap-2">
            <input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Verification code" className="flex-1 rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20" />
            <button type="button" onClick={requestCode} disabled={codePending||cooldown>0} className="px-3 py-2 rounded-md bg-[#00d4ff] text-[#00101a] disabled:opacity-50">{cooldown>0?`Get (${cooldown})`:(codePending?'Sending…':'Get code')}</button>
          </div>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="New password" className="w-full rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20" />
          <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} placeholder="Confirm new password" className="w-full rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20" />
          <button className="w-full rounded-md px-4 py-2 font-bold tracking-wider text-[#00101a] bg-[#00d4ff] disabled:opacity-50" disabled={pending}>{pending?'Submitting…':'Reset password'}</button>
          {msg && <div className="text-green-400 text-sm">{msg}</div>}
          {err && <div className="text-red-400 text-sm">{err}</div>}
        </form>
      </NeonAuthShell>
    </div>
  );
}


