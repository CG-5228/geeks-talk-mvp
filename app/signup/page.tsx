"use client";

import { useState } from 'react';
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
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', terms: false });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

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
        body: JSON.stringify(parsed.data),
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

            <div className="flex items-center gap-2">
              <input id="terms" name="terms" type="checkbox" checked={form.terms} onChange={onChange} className="h-4 w-4" />
              <label htmlFor="terms" className="text-sm text-[rgba(220,240,255,0.9)]">I agree to the Terms and Privacy Policy</label>
            </div>
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
