'use client';

import { useEffect, useState } from 'react';
import SettingsSidebar, { Section } from '@/components/profile/SettingsSidebar';
import ProfileSection from '@/components/profile/ProfileSection';
import AppearanceSection from '@/components/profile/AppearanceSection';
import NotificationsSection from '@/components/profile/NotificationsSection';
import PrivacySection from '@/components/profile/PrivacySection';
import AccountSection from '@/components/profile/AccountSection';

type ProfilePayload = {
  id: string;
  email: string | null;
  emailVerified: string | null;
  username: string | null;
  image: string | null;
  coverImage: string | null;
  bio: string | null;
  displayName: string | null;
  pronouns: string | null;
  location: string | null;
  website: string | null;
  socialLinks: Record<string, string | null> | null;
  accentColor: string | null;
  fontScale: 'sm' | 'md' | 'lg';
  reducedMotion: boolean;
  colorBlindMode: 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  emailDigest: 'off' | 'daily' | 'weekly';
  notifyBlogReplies: boolean;
  notifyDMs: boolean;
  notifyMentions: boolean;
  notifyFollows: boolean;
  profileVisibility: 'public' | 'friends' | 'private';
  showOnlineStatus: boolean;
  showEmailOnProfile: boolean;
  dmPermissions: 'everyone' | 'friends' | 'nobody';
  twoFactorEnabled: boolean;
};

function hashToSection(): Section | null {
  if (typeof window === 'undefined') return null;
  const h = window.location.hash.replace('#', '') as Section;
  if (['profile', 'appearance', 'notifications', 'privacy', 'account'].includes(h)) return h;
  return null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Section>('profile');

  useEffect(() => {
    const h = hashToSection();
    if (h) setActive(h);
    function onHash() {
      const h2 = hashToSection();
      if (h2) setActive(h2);
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash !== `#${active}`) {
        window.history.replaceState(null, '', `#${active}`);
      }
    }
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/profile')
      .then((r) => {
        if (r.status === 401) {
          window.location.href = '/signin';
          return null;
        }
        return r.json();
      })
      .then((d: ProfilePayload | null) => {
        if (!cancelled && d) setProfile(d);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your profile, security, and preferences.
          </p>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <aside className="lg:sticky lg:top-24 h-fit">
            <SettingsSidebar active={active} onChange={setActive} />
          </aside>

          <main className="min-w-0">
            <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-xl p-6 sm:p-8">
              {loading || !profile ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-lg bg-muted/10 animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {active === 'profile' && (
                    <ProfileSection
                      initial={{
                        username: profile.username || '',
                        displayName: profile.displayName,
                        bio: profile.bio,
                        pronouns: profile.pronouns,
                        location: profile.location,
                        website: profile.website,
                        socialLinks: profile.socialLinks,
                        image: profile.image,
                        email: profile.email,
                      }}
                    />
                  )}
                  {active === 'appearance' && (
                    <AppearanceSection
                      initial={{
                        accentColor: profile.accentColor,
                        fontScale: profile.fontScale,
                        reducedMotion: profile.reducedMotion,
                        colorBlindMode: profile.colorBlindMode,
                      }}
                    />
                  )}
                  {active === 'notifications' && (
                    <NotificationsSection
                      initial={{
                        emailDigest: profile.emailDigest,
                        notifyBlogReplies: profile.notifyBlogReplies,
                        notifyDMs: profile.notifyDMs,
                        notifyMentions: profile.notifyMentions,
                        notifyFollows: profile.notifyFollows,
                      }}
                    />
                  )}
                  {active === 'privacy' && (
                    <PrivacySection
                      initial={{
                        profileVisibility: profile.profileVisibility,
                        showOnlineStatus: profile.showOnlineStatus,
                        showEmailOnProfile: profile.showEmailOnProfile,
                        dmPermissions: profile.dmPermissions,
                      }}
                    />
                  )}
                  {active === 'account' && (
                    <AccountSection
                      initial={{
                        email: profile.email,
                        emailVerified: Boolean(profile.emailVerified),
                        twoFactorEnabled: profile.twoFactorEnabled,
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
