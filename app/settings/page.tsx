"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import SettingsSidebar from '@/components/profile/SettingsSidebar';
import ProfileSection from '@/components/profile/ProfileSection';
import AppearanceSection from '@/components/profile/AppearanceSection';
import NotificationsSection from '@/components/profile/NotificationsSection';
import PrivacySection from '@/components/profile/PrivacySection';
import AccountSection from '@/components/profile/AccountSection';

type Section = 'profile' | 'appearance' | 'notifications' | 'privacy' | 'account';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState<Section>('profile');

  // Mock user data - in production this would come from session/API
  const userData = {
    username: session?.user?.name || 'user',
    displayName: null,
    bio: null,
    email: session?.user?.email || null,
    avatarUrl: session?.user?.image || null,
    hasPassword: true, // This should come from your DB
  };

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <SettingsSidebar
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />
          </aside>

          {/* Main Content */}
          <main className="min-w-0">
            <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-xl p-6 sm:p-8">
              {activeSection === 'profile' && (
                <ProfileSection
                  initialUsername={userData.username}
                  initialDisplayName={userData.displayName}
                  initialBio={userData.bio}
                  email={userData.email}
                  avatarUrl={userData.avatarUrl}
                />
              )}
              {activeSection === 'appearance' && <AppearanceSection />}
              {activeSection === 'notifications' && <NotificationsSection />}
              {activeSection === 'privacy' && <PrivacySection />}
              {activeSection === 'account' && <AccountSection />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
