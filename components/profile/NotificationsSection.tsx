"use client";

import { useState } from 'react';

export default function NotificationsSection() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    dmNotifications: true,
    mentionNotifications: true,
    channelActivity: false,
    emailFrequency: 'realtime' as 'realtime' | 'daily' | 'weekly',
  });

  const toggle = (key: keyof typeof settings) => {
    if (key === 'emailFrequency') return;
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage how and when you receive notifications
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <label htmlFor="email-notif" className="block text-sm font-medium text-foreground">
              Email notifications
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Receive notifications via email
            </p>
          </div>
          <button
            id="email-notif"
            role="switch"
            aria-checked={settings.emailNotifications}
            onClick={() => toggle('emailNotifications')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
              settings.emailNotifications ? 'bg-primary' : 'bg-muted/30'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="h-px bg-border/20" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <label htmlFor="dm-notif" className="block text-sm font-medium text-foreground">
              Direct messages
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Get notified when someone sends you a DM
            </p>
          </div>
          <button
            id="dm-notif"
            role="switch"
            aria-checked={settings.dmNotifications}
            onClick={() => toggle('dmNotifications')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
              settings.dmNotifications ? 'bg-primary' : 'bg-muted/30'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.dmNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="h-px bg-border/20" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <label htmlFor="mention-notif" className="block text-sm font-medium text-foreground">
              Mentions
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Get notified when someone mentions you
            </p>
          </div>
          <button
            id="mention-notif"
            role="switch"
            aria-checked={settings.mentionNotifications}
            onClick={() => toggle('mentionNotifications')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
              settings.mentionNotifications ? 'bg-primary' : 'bg-muted/30'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.mentionNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="h-px bg-border/20" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <label htmlFor="channel-notif" className="block text-sm font-medium text-foreground">
              Channel activity
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Get notified about activity in your channels
            </p>
          </div>
          <button
            id="channel-notif"
            role="switch"
            aria-checked={settings.channelActivity}
            onClick={() => toggle('channelActivity')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
              settings.channelActivity ? 'bg-primary' : 'bg-muted/30'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                settings.channelActivity ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="h-px bg-border/20" />

        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Email frequency
          </label>
          <div className="flex flex-wrap gap-2">
            {(['realtime', 'daily', 'weekly'] as const).map((freq) => (
              <button
                key={freq}
                onClick={() => setSettings(prev => ({ ...prev, emailFrequency: freq }))}
                className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                  settings.emailFrequency === freq
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-card/30 border border-border/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                {freq === 'realtime' ? 'Real-time' : freq}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            How often you want to receive email notifications
          </p>
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

