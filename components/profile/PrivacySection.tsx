'use client';

import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { ToggleRow, SegmentedControl } from './SettingsToggle';

type Initial = {
  profileVisibility: 'public' | 'friends' | 'private';
  showOnlineStatus: boolean;
  showEmailOnProfile: boolean;
  dmPermissions: 'everyone' | 'friends' | 'nobody';
};

export default function PrivacySection({ initial }: { initial: Initial }) {
  const [profileVisibility, setProfileVisibility] = useState<Initial['profileVisibility']>(
    initial.profileVisibility,
  );
  const [showOnlineStatus, setShowOnlineStatus] = useState(initial.showOnlineStatus);
  const [showEmailOnProfile, setShowEmailOnProfile] = useState(initial.showEmailOnProfile);
  const [dmPermissions, setDmPermissions] = useState<Initial['dmPermissions']>(
    initial.dmPermissions,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileVisibility,
          showOnlineStatus,
          showEmailOnProfile,
          dmPermissions,
        }),
      });
      if (res.ok) setMessage({ type: 'success', text: 'Privacy saved' });
      else {
        const d = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: d.error || 'Failed to save' });
      }
    } finally {
      setPending(false);
    }
  }

  async function download() {
    setDownloading(true);
    try {
      const res = await fetch('/api/user/data-download');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `geeks-talk-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
      }
    } finally {
      setDownloading(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmDeletion: true }),
      });
      if (res.ok) window.location.href = '/';
      else {
        const d = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: d.error || 'Failed to delete account' });
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Privacy</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Decide who sees you and how they can reach you.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Profile visibility</h3>
        <SegmentedControl
          ariaLabel="Profile visibility"
          value={profileVisibility}
          onChange={setProfileVisibility}
          options={[
            { value: 'public', label: 'Public', hint: 'Anyone can see your profile.' },
            { value: 'friends', label: 'Friends', hint: 'Only mutual follows.' },
            { value: 'private', label: 'Private', hint: 'Hidden from everyone.' },
          ]}
        />
      </div>

      <div className="h-px bg-border/20" />

      <div className="divide-y divide-border/10">
        <ToggleRow
          label="Show online status"
          description="Others can see when you're online or away."
          checked={showOnlineStatus}
          onChange={setShowOnlineStatus}
        />
        <ToggleRow
          label="Show email on profile"
          description="Displays your email publicly. Off by default."
          checked={showEmailOnProfile}
          onChange={setShowEmailOnProfile}
        />
      </div>

      <div className="h-px bg-border/20" />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Who can DM you</h3>
        <SegmentedControl
          ariaLabel="DM permissions"
          value={dmPermissions}
          onChange={setDmPermissions}
          options={[
            { value: 'everyone', label: 'Everyone' },
            { value: 'friends', label: 'Friends only' },
            { value: 'nobody', label: 'Nobody' },
          ]}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save preferences'}
        </button>
        {message && (
          <div role="status" aria-live="polite" className={`text-sm ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="h-px bg-border/20" />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Your data</h3>
        <button
          onClick={download}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card/30 border border-border/20 text-foreground hover:bg-card/50 transition disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span className="text-sm">{downloading ? 'Preparing…' : 'Download your data'}</span>
        </button>
        <p className="mt-2 text-xs text-muted-foreground">
          A JSON export of your posts, comments, and settings.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-red-400 mb-3">Danger zone</h3>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-sm">Delete account</span>
          </button>
        ) : (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <p className="text-sm text-foreground mb-3">
              This cannot be undone. All posts, comments, messages, and uploads will be
              permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-card/40 border border-border/20 text-foreground hover:bg-card/60 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition text-sm disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Permanently delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
