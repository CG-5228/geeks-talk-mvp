'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';

type Check = {
  key: string;
  label: string;
  done: boolean;
  href?: string;
};

export default function ProfileCompletionMeter({
  image,
  displayName,
  bio,
  pronouns,
  location,
  website,
  socialLinks,
  emailVerified,
  twoFactorEnabled,
}: {
  image?: string | null;
  displayName?: string | null;
  bio?: string | null;
  pronouns?: string | null;
  location?: string | null;
  website?: string | null;
  socialLinks?: Record<string, string | null | undefined> | null;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}) {
  const checks = useMemo<Check[]>(() => {
    const hasSocial = Boolean(
      socialLinks &&
        Object.values(socialLinks).some((v) => typeof v === 'string' && v.trim().length > 0),
    );
    return [
      { key: 'avatar', label: 'Add a profile photo', done: Boolean(image), href: '/settings#profile' },
      { key: 'name', label: 'Set a display name', done: Boolean(displayName), href: '/settings#profile' },
      { key: 'bio', label: 'Write a short bio', done: Boolean(bio), href: '/settings#profile' },
      { key: 'details', label: 'Add pronouns or location', done: Boolean(pronouns || location), href: '/settings#profile' },
      { key: 'website', label: 'Link your website or socials', done: Boolean(website) || hasSocial, href: '/settings#profile' },
      { key: 'email', label: 'Verify your email', done: Boolean(emailVerified), href: '/settings#account' },
      { key: '2fa', label: 'Turn on two-factor auth', done: Boolean(twoFactorEnabled), href: '/settings#account' },
    ];
  }, [image, displayName, bio, pronouns, location, website, socialLinks, emailVerified, twoFactorEnabled]);

  const done = checks.filter((c) => c.done).length;
  const pct = Math.round((done / checks.length) * 100);

  if (pct === 100) return null;

  return (
    <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Profile completion</h3>
        <span className="text-sm text-primary font-medium">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted/20 overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-2">
        {checks.map((c) => (
          <li key={c.key}>
            {c.done ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground line-through">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {c.label}
              </span>
            ) : (
              <Link
                href={c.href || '/settings'}
                className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition"
              >
                <Circle className="h-4 w-4 text-muted-foreground" />
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
