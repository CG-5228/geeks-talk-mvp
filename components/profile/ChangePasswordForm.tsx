"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function ChangePasswordForm() {
  const { data: session } = useSession();
  const [currentPassword, setCurrent] = useState('');
  const [nextPassword, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [useCode, setUseCode] = useState(false);
  const email = (session?.user?.email || '').toString();
  const [code, setCode] = useState('');
  const [codePending, setCodePending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return; const id = setInterval(() => setCooldown((c)=>c-1), 1000); return () => clearInterval(id);
  }, [cooldown]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null); setErr(null);
    if (nextPassword !== confirm) { setErr('Passwords do not match'); return; }
    setPending(true);
    const payload = useCode ? { useCode: true, email, code, newPassword: nextPassword } : { currentPassword, newPassword: nextPassword };
    const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setMsg('Password updated'); else setErr(data.error || 'Failed');
    setPending(false);
  };

  const requestCode = async () => {
    setCodePending(true); setErr(null);
    try {
      const r = await fetch('/api/auth/request-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, purpose: 'change' }) });
      if (!r.ok) { const d = await r.json().catch(()=>({})); setErr(d.error || 'Failed to send code'); }
      else setCooldown(60);
    } finally { setCodePending(false); }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h2 className="text-lg font-semibold text-[rgba(236,245,255,0.95)]">Change password</h2>
      <label htmlFor="toggle-code" className="inline-flex items-center gap-2 select-none cursor-pointer">
        <input id="toggle-code" type="checkbox" checked={useCode} onChange={(e)=>setUseCode(e.target.checked)} className="peer sr-only" />
        <span className={`h-4 w-4 inline-flex items-center justify-center rounded border transition-colors ${useCode ? 'border-blue-400' : 'border-gray-400'}`}>
          {useCode && (
            <svg className="block h-3 w-3 text-blue-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2a1 1 0 011.415-1.42l2.492 2.492 6.492-6.492a1 1 0 011.416 0z" clipRule="evenodd" />
            </svg>
          )}
        </span>
        <span className="text-sm text-muted-foreground">Use email verification instead</span>
      </label>

      {useCode ? (
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3 text-xs text-muted-foreground -mb-1">Code will be sent to <span className="text-foreground font-medium">{email || 'your account email'}</span></div>
          <div className="sm:col-span-2 flex gap-2">
            <input type="text" value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Verification code" className="flex-1 rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20" />
            <button type="button" onClick={requestCode} disabled={codePending || cooldown>0} className="rounded-md px-4 py-2 bg-[#00d4ff] text-[#00101a] whitespace-nowrap disabled:opacity-50">{cooldown>0?`Get code (${cooldown})`:(codePending?'Sending…':'Get code')}</button>
          </div>
          <input type="password" value={nextPassword} onChange={(e) => setNext(e.target.value)} placeholder="New password" className="rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20 sm:col-span-1" />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" className="rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20 sm:col-span-2" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-3">
          <input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" className="rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20" />
          <input type="password" value={nextPassword} onChange={(e) => setNext(e.target.value)} placeholder="New password" className="rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20" />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" className="rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20" />
        </div>
      )}
      <button className="btn-primary rounded-md px-4 py-2" disabled={pending}>Update password</button>
      {msg && <div className="text-green-400 text-sm">{msg}</div>}
      {err && <div className="text-red-400 text-sm">{err}</div>}
    </form>
  );
}
