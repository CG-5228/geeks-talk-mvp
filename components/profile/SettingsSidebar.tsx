'use client';

import { useEffect, useMemo, useState } from 'react';
import { User, Palette, Bell, Shield, Key, Search } from 'lucide-react';

export type Section = 'profile' | 'appearance' | 'notifications' | 'privacy' | 'account';

const SECTIONS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }>; hint: string; keywords: string[] }[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    hint: 'g p',
    keywords: ['name', 'username', 'bio', 'avatar', 'photo', 'cover', 'pronouns', 'location', 'website', 'social', 'twitter', 'github', 'linkedin', 'instagram', 'youtube'],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    hint: 'g l',
    keywords: ['theme', 'dark', 'light', 'accent', 'color', 'font', 'size', 'motion', 'reduced', 'accessibility', 'blind'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    hint: 'g n',
    keywords: ['email', 'digest', 'weekly', 'daily', 'alerts', 'dm', 'follow', 'mention', 'reply'],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: Shield,
    hint: 'g r',
    keywords: ['public', 'private', 'friends', 'online', 'visibility', 'dm', 'data', 'download', 'delete', 'account'],
  },
  {
    id: 'account',
    label: 'Account',
    icon: Key,
    hint: 'g a',
    keywords: ['password', 'email', 'change', '2fa', 'two factor', 'otp', 'sessions', 'device', 'google', 'oauth', 'sign in', 'security'],
  },
];

export default function SettingsSidebar({
  active,
  onChange,
}: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.includes(q)),
    );
  }, [query]);

  useEffect(() => {
    let pending: Section | null = null;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        pending = 'profile' as Section;
        setTimeout(() => (pending = null), 800);
        return;
      }
      if (pending) {
        const map: Record<string, Section> = {
          p: 'profile',
          l: 'appearance',
          n: 'notifications',
          r: 'privacy',
          a: 'account',
        };
        const target = map[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          onChange(target);
        }
        pending = null;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onChange]);

  return (
    <nav className="space-y-3" aria-label="Settings navigation">
      <label className="flex items-center gap-2 rounded-lg border border-border/20 bg-card/30 px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search settings…"
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
      </label>

      <ul className="space-y-1">
        {filtered.map(({ id, label, icon: Icon, hint }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <button
                onClick={() => onChange(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="flex-1 text-left">{label}</span>
                <kbd className="hidden sm:inline-flex text-[10px] text-muted-foreground font-mono">
                  {hint}
                </kbd>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-xs text-muted-foreground">No matches.</li>
        )}
      </ul>

      <div className="pt-2 text-[11px] text-muted-foreground px-1">
        Tip: press <kbd className="font-mono text-foreground">g</kbd> then a letter to jump.
      </div>
    </nav>
  );
}
