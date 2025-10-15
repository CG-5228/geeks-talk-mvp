"use client";

import ChangePasswordForm from './ChangePasswordForm';

export default function AccountSection({ hasPassword }: { hasPassword: boolean }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account security and authentication
        </p>
      </div>

      {hasPassword ? (
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
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/20 bg-card/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-sm">
                G
              </div>
              <span className="text-sm text-foreground">Google</span>
            </div>
            <button className="text-xs px-3 py-1.5 rounded-md bg-muted/20 hover:bg-muted/30 transition text-foreground">
              Connect
            </button>
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

