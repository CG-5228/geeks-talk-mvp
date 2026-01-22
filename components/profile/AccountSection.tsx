"use client";

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import ChangePasswordForm from './ChangePasswordForm';

type AccountInfo = {
  hasPassword: boolean;
  googleLinked: boolean;
  googleEmail: string | null;
};

export default function AccountSection() {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccountInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/user/account');
        if (!res.ok) {
          throw new Error('Failed to load account info');
        }
        const data = await res.json();
        console.log('Account info loaded:', data);
        setAccountInfo(data);
      } catch (err) {
        console.error('Error loading account info', err);
        setError('Unable to load account details right now.');
      } finally {
        setLoading(false);
      }
    };

    void fetchAccountInfo();

    // Refetch when returning from OAuth callback (check URL params)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('section') === 'account') {
      // Small delay to ensure backend has processed the OAuth callback
      setTimeout(() => {
        void fetchAccountInfo();
      }, 1000);
    }
  }, []);

  const handleConnectGoogle = () => {
    // Start Google OAuth flow to link the current account
    void signIn('google', {
      callbackUrl: '/settings?section=account',
    });
  };

  const hasPassword = accountInfo?.hasPassword ?? true;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account security and authentication
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border/20 bg-card/30 p-6">
          <p className="text-sm text-muted-foreground">Loading account details...</p>
        </div>
      ) : hasPassword ? (
        <div className="rounded-xl border border-border/20 bg-card/30 p-6">
          <ChangePasswordForm />
        </div>
      ) : (
        <div className="rounded-xl border border-border/20 bg-card/30 p-6">
          <p className="text-sm text-muted-foreground">
            You're signed in with an external provider (e.g., Google). Password management is not available.
          </p>
        </div>
      )}

      <div className="h-px bg-border/20" />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Connected accounts</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Link external accounts for easier sign-in
        </p>
        {error && (
          <p className="mb-3 text-xs text-red-400">
            {error}
          </p>
        )}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/20 bg-card/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-sm">
                G
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-foreground">Google</span>
                {accountInfo?.googleLinked && accountInfo.googleEmail && (
                  <span className="text-xs text-muted-foreground">
                    Connected as {accountInfo.googleEmail}
                  </span>
                )}
              </div>
            </div>
            {accountInfo?.googleLinked ? (
              <button
                disabled
                className="text-xs px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
              >
                Connected
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="text-xs px-3 py-1.5 rounded-md bg-muted/20 hover:bg-muted/30 transition text-foreground"
              >
                Connect
              </button>
            )}
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/20 bg-card/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-sm">
                GH
              </div>
              <span className="text-sm text-foreground">GitHub</span>
            </div>
            <button className="text-xs px-3 py-1.5 rounded-md bg-muted/20 hover:bg-muted/30 transition text-foreground">
              Connect
            </button>
          </div>
        </div>
      </div>

      <div className="h-px bg-border/20" />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Two-factor authentication</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add an extra layer of security to your account (coming soon)
        </p>
        <button
          disabled
          className="px-4 py-2.5 rounded-lg bg-muted/20 text-muted-foreground cursor-not-allowed text-sm"
        >
          Enable 2FA
        </button>
      </div>
    </div>
  );
}

