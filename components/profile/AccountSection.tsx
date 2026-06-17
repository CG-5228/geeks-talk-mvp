'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import ChangePasswordForm from './ChangePasswordForm';
import EmailChangeCard from './EmailChangeCard';
import TwoFactorSetup from './TwoFactorSetup';
import SessionsList from './SessionsList';

type AccountInfo = {
  hasPassword: boolean;
  googleLinked: boolean;
  googleEmail: string | null;
};

type Initial = {
  email: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
};

export default function AccountSection({ initial }: { initial: Initial }) {
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [twoFA, setTwoFA] = useState(initial.twoFactorEnabled);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/account')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setInfo(d);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign-in, security, and your connected accounts.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Email</h3>
        <EmailChangeCard currentEmail={initial.email} emailVerified={initial.emailVerified} />
      </div>

      <div className="h-px bg-border/20" />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Password</h3>
        {loading ? (
          <div className="rounded-xl border border-border/20 bg-card/30 p-5 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : info?.hasPassword ? (
          <div className="rounded-xl border border-border/20 bg-card/30 p-5">
            <ChangePasswordForm />
          </div>
        ) : (
          <div className="rounded-xl border border-border/20 bg-card/30 p-5 text-sm text-muted-foreground">
            You signed in with an external provider. Password management is not available.
          </div>
        )}
      </div>

      <div className="h-px bg-border/20" />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Two-factor authentication</h3>
        <TwoFactorSetup enabled={twoFA} onChange={setTwoFA} />
      </div>

      <div className="h-px bg-border/20" />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Devices</h3>
        <SessionsList />
      </div>

      <div className="h-px bg-border/20" />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Connected accounts</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/20 bg-card/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-sm font-semibold">
                G
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-foreground">Google</span>
                {info?.googleLinked && info.googleEmail && (
                  <span className="text-xs text-muted-foreground truncate">
                    Connected as {info.googleEmail}
                  </span>
                )}
              </div>
            </div>
            {info?.googleLinked ? (
              <span className="text-xs px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Connected
              </span>
            ) : (
              <button
                onClick={() =>
                  signIn('google', { callbackUrl: '/settings?section=account' })
                }
                className="text-xs px-3 py-1.5 rounded-md bg-muted/20 hover:bg-muted/30 transition text-foreground"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
