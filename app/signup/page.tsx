"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RegisterSchema } from '@/lib/validators';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NeonAuthShell from '@/components/auth/NeonAuthShell';
import FloatingInput from '@/components/ui/FloatingInput';
import PasswordStrength from '@/components/ui/PasswordStrength';
import ParticlesBackground from '@/components/auth/ParticlesBackground';

export default function SignUpPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', code: '', terms: false });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [codePending, setCodePending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  if (session?.user) {
    router.replace('/profile');
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const v = type === 'checkbox' ? checked : value;
    setForm((prev) => ({ ...prev, [name]: v }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const parsed = RegisterSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed.data, code: form.code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fieldErrors || { form: [data.error || 'Registration failed'] });
        return;
      }
      await signIn('credentials', { email: form.email, password: form.password, redirect: true, callbackUrl: '/profile' });
    } catch (err) {
      setErrors({ form: ['Unexpected error. Please try again.'] });
    } finally {
      setLoading(false);
    }
  };

  const allowedDomains = ['icloud.com','gmail.com','outlook.com','yahoo.com','qq.com'];
  const canRequestCode = () => {
    const domain = form.email.split('@')[1]?.toLowerCase();
    return !!domain && allowedDomains.includes(domain);
  };

  const requestCode = async () => {
    setErrors((e) => ({ ...e, code: [] } as any));
    if (!canRequestCode()) {
      setErrors((e) => ({ ...e, email: ['Only icloud/gmail/outlook/yahoo/qq are allowed'] } as any));
      return;
    }
    setCodePending(true);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, purpose: 'signup' })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrors((e) => ({ ...e, code: [d.error || 'Failed to send code'] } as any));
      } else {
        setCooldown(60);
      }
    } finally {
      setCodePending(false);
    }
  };

  return (
    <div className="relative overflow-visible">
      <ParticlesBackground />
      <NeonAuthShell title="Create your account" subtitle="Join the Geeks Talk community.">
        <div className="space-y-5">
          <button
            onClick={() => signIn('google', { callbackUrl: '/profile' })}
            className="w-full rounded-md px-4 py-2 font-bold tracking-wider text-[#00101a] bg-[#00d4ff] shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.6)] hover:scale-[1.02] transition"
          >
            Continue with Google
          </button>

          <div className="relative">
            <div className="h-px w-full bg-[color:var(--border)]/60" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <FloatingInput
              id="username"
              name="username"
              type="text"
              label="Username"
              value={form.username}
              onChange={onChange}
              placeholder="your_handle"
              aria-invalid={!!errors.username}
            />
            {errors.username && <p className="text-sm text-red-300">{errors.username[0]}</p>}

            <FloatingInput
              id="email"
              name="email"
              type="email"
              label="Email"
              value={form.email}
              onChange={onChange}
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-sm text-red-300">{errors.email[0]}</p>}

            <div>
              <FloatingInput
                id="password"
                name="password"
                type="password"
                label="Password"
                value={form.password}
                onChange={onChange}
                aria-invalid={!!errors.password}
                autoComplete="new-password"
              />
              <PasswordStrength value={form.password} />
              {errors.password && <p className="text-sm text-red-300 mt-1">{errors.password[0]}</p>}
            </div>

            <FloatingInput
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirm Password"
              value={form.confirmPassword}
              onChange={onChange}
              aria-invalid={!!errors.confirmPassword}
              autoComplete="new-password"
            />
            {errors.confirmPassword && <p className="text-sm text-red-300">{errors.confirmPassword[0]}</p>}

            {/* Verification code */}
            <div>
              <label className="block text-sm text-[rgba(220,240,255,0.85)] mb-1">Verification code</label>
              <div className="flex gap-2">
                <input
                  name="code"
                  value={form.code}
                  onChange={onChange}
                  inputMode="numeric"
                  placeholder="6-digit code"
                  className="flex-1 rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20"
                />
                <button type="button" onClick={requestCode} disabled={codePending || cooldown>0 || !canRequestCode()} className="px-3 py-2 rounded-md bg-[#00d4ff] text-[#00101a] disabled:opacity-50">
                  {cooldown>0 ? `Get (${cooldown})` : (codePending ? 'Sending…' : 'Get code')}
                </button>
              </div>
              {errors.code && <p className="text-sm text-red-300 mt-1">{errors.code[0]}</p>}
              {!canRequestCode() && form.email && <p className="text-xs text-amber-300 mt-1">Allowed: icloud, gmail, outlook, yahoo, qq</p>}
            </div>

            <label htmlFor="terms" className="inline-flex items-center gap-2 select-none cursor-pointer">
              <input id="terms" name="terms" type="checkbox" checked={form.terms} onChange={onChange} className="peer sr-only" />
              <span className={`h-4 w-4 inline-flex items-center justify-center rounded border transition-colors ${form.terms ? 'border-blue-400' : 'border-gray-400'}`}>
                {form.terms && (
                  <svg className="block h-3 w-3 text-blue-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.2-3.2a1 1 0 011.415-1.42l2.492 2.492 6.492-6.492a1 1 0 011.416 0z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <span className="text-sm text-[rgba(220,240,255,0.9)]">I agree to the Terms and Privacy Policy</span>
            </label>
            {errors.terms && <p className="text-sm text-red-300">{errors.terms[0]}</p>}

            <button
              type="submit"
              className="w-full rounded-md px-4 py-2 font-bold tracking-wider text-[#00101a] bg-[#00d4ff] hover:scale-[1.02] shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.6)] transition disabled:opacity-50"
              disabled={loading || !form.terms}
              aria-busy={loading}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
            {errors.form && <p className="text-sm text-red-300 mt-1">{errors.form[0]}</p>}
          </form>

          <p className="text-center text-sm text-[rgba(220,240,255,0.8)]">
            Already have an account? {" "}
            <Link href="/signin" className="text-[#00d4ff] hover:[text-shadow:0_0_10px_rgba(0,212,255,0.6)] underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </NeonAuthShell>
    </div>
  );
}
