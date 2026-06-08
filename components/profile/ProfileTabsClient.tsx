'use client';

import { useState } from 'react';
import ActivityFeed from './ActivityFeed';
import BadgeGrid from './BadgeGrid';

type Tab = 'overview' | 'activity' | 'badges';

export default function ProfileTabsClient({
  username,
  overview,
  defaultTab = 'overview',
}: {
  username?: string;
  overview: React.ReactNode;
  defaultTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'activity', label: 'Activity' },
    { key: 'badges', label: 'Badges' },
  ];

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Profile sections"
        className="flex items-center gap-1 border-b border-border/30 overflow-x-auto"
      >
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition relative ${
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-t bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === 'overview' && overview}
        {tab === 'activity' && <ActivityFeed username={username} />}
        {tab === 'badges' && <BadgeGrid username={username} />}
      </div>
    </div>
  );
}
