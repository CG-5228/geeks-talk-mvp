"use client";

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Calendar, Users, Settings } from 'lucide-react';

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"%3E%3Ccircle cx="64" cy="64" r="64" fill="%23334155"/%3E%3Cpath d="M64 64a20 20 0 100-40 20 20 0 000 40zM32 96c0-16 14.4-28 32-28s32 12 32 28" fill="%23475569"/%3E%3C/svg%3E';

type ProfileData = {
  username: string;
  displayName?: string | null;
  bio?: string | null;
  email?: string | null;
  image?: string | null;
  createdAt?: Date | string;
  friendsCount: number;
  isOwnProfile: boolean;
};

export default function ProfileDisplay({ profile }: { profile: ProfileData }) {
  return (
    <div className="space-y-6">
      {/* Header with avatar and basic info */}
      <div className="relative rounded-xl border border-border/20 bg-card/30 backdrop-blur-xl overflow-hidden">
        {/* Cover gradient */}
        <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
        
        <div className="px-6 pb-6">
          {/* Avatar overlapping cover */}
          <div className="relative -mt-16 mb-4 inline-block">
            <div className="relative w-32 h-32 rounded-full border-4 border-card bg-card">
              <Image
                src={profile.image || DEFAULT_AVATAR}
                alt={profile.username}
                fill
                className="rounded-full object-cover"
                unoptimized={!profile.image}
              />
            </div>
          </div>

          {/* Name and username */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {profile.displayName || profile.username}
              </h1>
              {profile.displayName && (
                <p className="text-muted-foreground">@{profile.username}</p>
              )}
            </div>

            {profile.isOwnProfile && (
              <Link
                href="/settings"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition text-sm font-medium"
              >
                <Settings className="h-4 w-4" />
                Edit Profile
              </Link>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-4 text-foreground whitespace-pre-wrap">{profile.bio}</p>
          )}

          {/* Meta info */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {profile.createdAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>
                  Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{profile.friendsCount} friends</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Messages', value: '1.2k' },
          { label: 'Channels', value: '12' },
          { label: 'Helpful', value: '89%' },
          { label: 'Streak', value: '7d' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-xl p-4 text-center"
          >
            <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground text-center py-8">
            Activity feed coming soon
          </div>
        </div>
      </div>

      {/* Badges or achievements */}
      <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Badges</h2>
        <div className="text-sm text-muted-foreground text-center py-8">
          Earn badges by being helpful
        </div>
      </div>
    </div>
  );
}

