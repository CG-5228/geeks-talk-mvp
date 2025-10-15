"use client";
import { useState } from 'react';
import ProfileForm from '@/components/profile/ProfileForm';
import FriendsCount from '@/components/profile/FriendsCount';
import AccountSettingsForm from '@/components/profile/AccountSettingsForm';

type Props = {
  initialUsername: string;
  email: string | null;
  friendsCount: number;
  hasPassword: boolean;
};

export default function ProfileTabs({ initialUsername, email, friendsCount, hasPassword }: Props) {
  const [tab, setTab] = useState<'profile' | 'account'>('profile');
  return (
    <div className="p-4">
      <div className="flex items-center gap-4 border-b border-[color:var(--nav-border)]/20">
        <button
          className={`py-2 px-1 text-sm ${tab === 'profile' ? 'text-white' : 'text-[rgba(220,235,255,0.75)]'}`}
          onClick={() => setTab('profile')}
          aria-current={tab === 'profile' ? 'page' : undefined}
        >
          Profile
        </button>
        <button
          className={`py-2 px-1 text-sm ${tab === 'account' ? 'text-white' : 'text-[rgba(220,235,255,0.75)]'}`}
          onClick={() => setTab('account')}
          aria-current={tab === 'account' ? 'page' : undefined}
        >
          Account
        </button>
      </div>
      <div className="mt-4">
        {tab === 'profile' ? (
          <div className="space-y-4">
            <ProfileForm initialUsername={initialUsername} email={email} />
            <div className="text-[rgba(220,235,255,0.85)]">Friends: <FriendsCount initialCount={friendsCount} /></div>
          </div>
        ) : (
          <div className="space-y-2">
            {hasPassword ? (
              <AccountSettingsForm />
            ) : (
              <div className="text-[rgba(220,235,255,0.8)] text-sm">
                Your account uses an external provider (e.g., Google). Password settings aren’t available.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
