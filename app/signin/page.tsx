"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import NeonAuthShell from "@/components/auth/NeonAuthShell";
import ParticlesBackground from "@/components/auth/ParticlesBackground";
import FloatingInput from "@/components/ui/FloatingInput";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get('callbackUrl') || '/profile';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        email,
        password,
        totp: totp || undefined,
        redirect: false, // Don't let NextAuth handle redirect
        callbackUrl: callbackUrl,
      });

      if (res?.error) {
        const err = res.error || "";
        if (err.includes("2FA_REQUIRED")) {
          setNeeds2fa(true);
          setError("Enter the 6-digit code from your authenticator app (or a backup code).");
        } else if (err.includes("2FA_RATE_LIMIT")) {
          setNeeds2fa(true);
          setError("Too many attempts. Please wait a minute and try again.");
        } else if (err.includes("2FA_INVALID")) {
          setNeeds2fa(true);
          setError("Invalid authenticator code. Please try again.");
        } else {
          setError("Invalid credentials");
        }
        console.error('Login error:', res.error);
      } else if (res?.ok) {
        // Manual redirect after successful login

        // Use router.push for better cross-subdomain handling
        router.push(callbackUrl);
      } else {

      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-visible">
      <ParticlesBackground />
      <NeonAuthShell title="Welcome back" subtitle="Sign in to continue">
      <div className="space-y-5">
        <button
          onClick={async () => {

            try {

              // For live subdomain, redirect to main domain for OAuth
              const currentHost = window.location.host;
              if (currentHost.startsWith('live.')) {
                const mainDomain = currentHost.replace('live.', '');
                // Create a transfer URL that will redirect back to live subdomain with session
                const transferUrl = `${window.location.protocol}//${mainDomain}/live/transfer-session?redirect=${encodeURIComponent(callbackUrl)}`;
                const oauthUrl = `${window.location.protocol}//${mainDomain}/api/auth/signin/google?callbackUrl=${encodeURIComponent(transferUrl)}`;
                window.location.href = oauthUrl;
                return;
              }

              await signIn("google", {
                callbackUrl: callbackUrl
              });
            } catch (error) {
              console.error('Google signin exception:', error);
              setError('Google signin failed');
            }
          }}
          className="w-full rounded-md px-4 py-2 font-bold tracking-wider text-[#00101a] bg-[#00d4ff] shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.6)] hover:scale-[1.02] transition"
        >
          Continue with Google
        </button>
        <div className="relative">
          <div className="h-px w-full bg-[color:var(--border)]/60" />
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <FloatingInput
            id="email"
            name="email"
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <FloatingInput
            id="password"
            name="password"
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {needs2fa && (
            <FloatingInput
              id="totp"
              name="totp"
              type="text"
              label="2FA code"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              autoComplete="one-time-code"
            />
          )}
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-md px-4 py-2 font-bold tracking-wider text-[#00101a] bg-[#00d4ff] hover:scale-[1.02] shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.6)] transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="text-center text-sm text-[rgba(220,240,255,0.8)]">
          Don&apos;t have an account? {" "}
          <Link href="/signup" className="text-[#00d4ff] hover:[text-shadow:0_0_10px_rgba(0,212,255,0.6)] underline-offset-4 hover:underline">
            Sign up
          </Link>
        </p>
        <p className="text-center text-sm text-[rgba(220,240,255,0.8)] mt-2">
          Forgot your password? {" "}
          <Link href="/reset" className="text-[#00d4ff] hover:[text-shadow:0_0_10px_rgba(0,212,255,0.6)] underline-offset-4 hover:underline">
            Reset it
          </Link>
        </p>
      </div>
      </NeonAuthShell>
    </div>
  );
}
