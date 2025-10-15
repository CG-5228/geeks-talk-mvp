"use client";

import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';

export default function PrivacySection() {
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public' as 'public' | 'friends' | 'private',
    showOnlineStatus: true,
    dmPermissions: 'everyone' as 'everyone' | 'friends' | 'nobody',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Privacy & Security</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Control who can see your information and contact you
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Profile visibility
          </label>
          <div className="flex flex-wrap gap-2">
            {(['public', 'friends', 'private'] as const).map((vis) => (
              <button
                key={vis}
                onClick={() => setPrivacy(prev => ({ ...prev, profileVisibility: vis }))}
                className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                  privacy.profileVisibility === vis
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-card/30 border border-border/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                {vis}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Who can view your profile and activity
          </p>
        </div>

        <div className="h-px bg-border/20" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <label htmlFor="online-status" className="block text-sm font-medium text-foreground">
              Show online status
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Let others see when you're online
            </p>
          </div>
          <button
            id="online-status"
            role="switch"
            aria-checked={privacy.showOnlineStatus}
            onClick={() => setPrivacy(prev => ({ ...prev, showOnlineStatus: !prev.showOnlineStatus }))}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
              privacy.showOnlineStatus ? 'bg-primary' : 'bg-muted/30'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                privacy.showOnlineStatus ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="h-px bg-border/20" />

        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Who can send you DMs
          </label>
          <div className="flex flex-wrap gap-2">
            {(['everyone', 'friends', 'nobody'] as const).map((perm) => (
              <button
                key={perm}
                onClick={() => setPrivacy(prev => ({ ...prev, dmPermissions: perm }))}
                className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                  privacy.dmPermissions === perm
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-card/30 border border-border/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                {perm}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Control who can start a direct message conversation with you
          </p>
        </div>

        <div className="h-px bg-border/20" />

        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Data management</h3>
          <div className="space-y-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card/30 border border-border/20 text-foreground hover:bg-card/50 transition w-full sm:w-auto">
              <Download className="h-4 w-4" />
              <span className="text-sm">Download your data</span>
            </button>
            <p className="text-xs text-muted-foreground">
              Request a copy of your personal data
            </p>
          </div>
        </div>

        <div className="h-px bg-border/20" />

        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Danger zone</h3>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm">Delete account</span>
            </button>
          ) : (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm text-foreground mb-3">
                Are you sure? This action cannot be undone. All your data will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-card/30 border border-border/20 text-foreground hover:bg-card/50 transition text-sm"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition text-sm">
                  Permanently delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4">
        <button className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition">
          Save preferences
        </button>
      </div>
    </div>
  );
}

