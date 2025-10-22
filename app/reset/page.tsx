"use client";
import { useEffect, useState } from 'react';
import NeonAuthShell from '@/components/auth/NeonAuthShell';
import ParticlesBackground from '@/components/auth/ParticlesBackground';
import FloatingInput from '@/components/ui/FloatingInput';

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

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isAllowedEmailDomain = (email: string) => {
    const allowed = ['icloud.com','gmail.com','outlook.com','yahoo.com','qq.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return !!domain && allowed.includes(domain);
  };

  const requestCode = async () => {
    setCodePending(true); 
    setErr(null); 
    setMsg(null);
    
    // Validate email
    if (!email.trim()) {
      setErr('Email is required');
      setCodePending(false);
      return;
    }
    
    if (!isValidEmail(email)) {
      setErr('Please enter a valid email address');
      setCodePending(false);
      return;
    }
    
    if (!isAllowedEmailDomain(email)) {
      setErr('Email provider not supported. Allowed: icloud, gmail, outlook, yahoo, qq');
      setCodePending(false);
      return;
    }
    
    try {
      const r = await fetch('/api/auth/request-code', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: 'reset' }) 
      });
      
      if (!r.ok) { 
        const d = await r.json().catch(() => ({})); 
        setErr(d.error || 'Failed to send code'); 
      } else {
        setMsg('Verification code sent to your email!');
        setCooldown(60);
      }
    } catch (error) {
      setErr('Network error. Please try again.');
    } finally { 
      setCodePending(false); 
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setErr(null); 
    setMsg(null);
    
    // Validate all fields
    if (!email.trim()) {
      setErr('Email is required');
      return;
    }
    
    if (!isValidEmail(email)) {
      setErr('Please enter a valid email address');
      return;
    }
    
    if (!code.trim()) {
      setErr('Verification code is required');
      return;
    }
    
    if (!password.trim()) {
      setErr('New password is required');
      return;
    }
    
    if (password.length < 8) {
      setErr('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirm) { 
      setErr('Passwords do not match'); 
      return; 
    }
    
    setPending(true);
    try {
      const r = await fetch('/api/auth/reset-password', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          code: code.trim(), 
          newPassword: password 
        }) 
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d.error || 'Failed to reset password');
      } else {
        setMsg('Password reset successfully! You can now sign in with your new password.');
        // Clear form
        setEmail('');
        setCode('');
        setPassword('');
        setConfirm('');
      }
    } catch (error) {
      setErr('Network error. Please try again.');
    } finally { 
      setPending(false); 
    }
  };

  return (
    <div className="relative overflow-visible">
      <ParticlesBackground />
      <NeonAuthShell title="Reset password" subtitle="We will email you a verification code.">
        <form onSubmit={onSubmit} className="space-y-4">
          <FloatingInput
            id="email"
            name="email"
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          
          <div className="flex gap-2">
            <FloatingInput
              id="code"
              name="code"
              type="text"
              label="Verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              inputMode="numeric"
              className="flex-1"
            />
            <button 
              type="button" 
              onClick={requestCode} 
              disabled={codePending || cooldown > 0 || !email.trim()} 
              className="px-4 py-2 rounded-md bg-[#00d4ff] text-[#00101a] disabled:opacity-50 whitespace-nowrap self-end"
            >
              {cooldown > 0 ? `Get (${cooldown})` : (codePending ? 'Sending…' : 'Get code')}
            </button>
          </div>
          
          <FloatingInput
            id="password"
            name="password"
            type="password"
            label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            required
            autoComplete="new-password"
          />
          
          <FloatingInput
            id="confirm"
            name="confirm"
            type="password"
            label="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            required
            autoComplete="new-password"
          />
          
          <button 
            type="submit"
            className="w-full rounded-md px-4 py-2 font-bold tracking-wider text-[#00101a] bg-[#00d4ff] disabled:opacity-50 hover:scale-[1.02] transition-all duration-200" 
            disabled={pending}
          >
            {pending ? 'Resetting password…' : 'Reset password'}
          </button>
          
          {msg && <div className="text-green-400 text-sm text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">{msg}</div>}
          {err && <div className="text-red-400 text-sm text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">{err}</div>}
        </form>
      </NeonAuthShell>
    </div>
  );
}


