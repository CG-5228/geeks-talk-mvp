'use client';

import { useState } from 'react';
import { ToggleRow, SegmentedControl } from './SettingsToggle';

type Initial = {
  emailDigest: 'off' | 'daily' | 'weekly';
  notifyBlogReplies: boolean;
  notifyDMs: boolean;
  notifyMentions: boolean;
  notifyFollows: boolean;
};

export default function NotificationsSection({ initial }: { initial: Initial }) {
  const [emailDigest, setEmailDigest] = useState<Initial['emailDigest']>(initial.emailDigest);
  const [notifyBlogReplies, setNotifyBlogReplies] = useState(initial.notifyBlogReplies);
  const [notifyDMs, setNotifyDMs] = useState(initial.notifyDMs);
  const [notifyMentions, setNotifyMentions] = useState(initial.notifyMentions);
  const [notifyFollows, setNotifyFollows] = useState(initial.notifyFollows);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailDigest,
          notifyBlogReplies,
          notifyDMs,
          notifyMentions,
          notifyFollows,
        }),
      });
      if (res.ok) setMessage({ type: 'success', text: 'Preferences saved' });
      else {
        const d = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: d.error || 'Failed to save' });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Control what you hear about and how often.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Email digest</h3>
        <SegmentedControl
          ariaLabel="Email digest"
          value={emailDigest}
          onChange={setEmailDigest}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
          ]}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          A summary of what you missed, delivered to your inbox.
        </p>
      </div>

      <div className="h-px bg-border/20" />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">In-app notifications</h3>
        <div className="divide-y divide-border/10">
          <ToggleRow
            label="Blog replies"
            description="When someone replies to your post or comment."
            checked={notifyBlogReplies}
            onChange={setNotifyBlogReplies}
          />
          <ToggleRow
            label="Direct messages"
            description="New DMs from friends and others."
            checked={notifyDMs}
            onChange={setNotifyDMs}
          />
          <ToggleRow
            label="Mentions"
            description="When you're @mentioned anywhere on the site."
            checked={notifyMentions}
            onChange={setNotifyMentions}
          />
          <ToggleRow
            label="New followers"
            description="When someone starts following you."
            checked={notifyFollows}
            onChange={setNotifyFollows}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
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
    </div>
  );
}
