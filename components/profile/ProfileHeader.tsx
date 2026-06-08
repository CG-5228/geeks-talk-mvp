'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Settings,
  MapPin,
  Link as LinkIcon,
  Twitter,
  Github,
  Linkedin,
  Instagram,
  Youtube,
  BadgeCheck,
  ShieldCheck,
  Circle,
} from 'lucide-react';
import CoverUploader from './CoverUploader';
import LikeButton from './LikeButton';

const DEFAULT_AVATAR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"%3E%3Ccircle cx="80" cy="80" r="80" fill="%23334155"/%3E%3Cpath d="M80 80a24 24 0 100-48 24 24 0 000 48zM40 120c0-20 18-36 40-36s40 16 40 36" fill="%23475569"/%3E%3C/svg%3E';

type SocialLinks = {
  twitter?: string | null;
  github?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  youtube?: string | null;
};

export type ProfileHeaderData = {
  userId?: string;
  username: string;
  displayName?: string | null;
  image?: string | null;
  coverImage?: string | null;
  bio?: string | null;
  pronouns?: string | null;
  location?: string | null;
  website?: string | null;
  socialLinks?: SocialLinks | null;
  createdAt?: Date | string | null;
  friendsCount: number;
  postCount?: number;
  likesCount?: number;
  isLiked?: boolean;
  isOwnProfile: boolean;
  onlineStatus?: string | null;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
};

function socialUrl(platform: keyof SocialLinks, handle: string): string | null {
  const h = handle.replace(/^@/, '').trim();
  if (!h) return null;
  if (/^https?:\/\//i.test(h)) return h;
  switch (platform) {
    case 'twitter':
      return `https://twitter.com/${h}`;
    case 'github':
      return `https://github.com/${h}`;
    case 'linkedin':
      return `https://www.linkedin.com/in/${h}`;
    case 'instagram':
      return `https://instagram.com/${h}`;
    case 'youtube':
      return h.startsWith('@') ? `https://youtube.com/${h}` : `https://youtube.com/@${h}`;
    default:
      return null;
  }
}

const SOCIAL_ICONS: Record<keyof SocialLinks, React.ComponentType<{ className?: string }>> = {
  twitter: Twitter,
  github: Github,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
};

export default function ProfileHeader({ profile }: { profile: ProfileHeaderData }) {
  const onlineDot =
    profile.onlineStatus === 'online'
      ? 'bg-emerald-400'
      : profile.onlineStatus === 'away'
        ? 'bg-amber-400'
        : 'bg-slate-500';

  return (
    <div className="relative rounded-xl border border-border/20 bg-card/30 backdrop-blur-xl overflow-hidden">
      <CoverUploader coverImage={profile.coverImage} editable={profile.isOwnProfile} />

      <div className="px-4 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 sm:-mt-16">
          <div className="flex items-end gap-4">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-card bg-card shadow-lg">
              <Image
                src={profile.image || DEFAULT_AVATAR}
                alt={profile.username}
                fill
                className="rounded-full object-cover"
                unoptimized={!profile.image}
                sizes="128px"
                priority
              />
              {profile.onlineStatus && (
                <span
                  className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-card ${onlineDot}`}
                  aria-label={`Status: ${profile.onlineStatus}`}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:pb-2">
            {profile.isOwnProfile ? (
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition text-sm font-medium"
              >
                <Settings className="h-4 w-4" />
                Edit profile
              </Link>
            ) : (
              profile.userId && (
                <LikeButton
                  userId={profile.userId}
                  initialLikesCount={profile.likesCount || 0}
                  initialIsLiked={profile.isLiked || false}
                />
              )
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {profile.displayName || profile.username}
            </h1>
            {profile.emailVerified && (
              <span
                title="Verified email"
                className="inline-flex items-center text-emerald-400"
              >
                <BadgeCheck className="h-5 w-5" />
              </span>
            )}
            {profile.twoFactorEnabled && (
              <span title="2FA enabled" className="inline-flex items-center text-violet-400">
                <ShieldCheck className="h-4 w-4" />
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
            <span>@{profile.username}</span>
            {profile.pronouns && (
              <>
                <Circle className="h-1 w-1 fill-current" />
                <span>{profile.pronouns}</span>
              </>
            )}
          </div>
        </div>

        {profile.bio && (
          <p className="mt-3 text-foreground whitespace-pre-wrap leading-relaxed">
            {profile.bio}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {profile.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {profile.location}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <LinkIcon className="h-4 w-4" />
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {profile.createdAt && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Joined{' '}
              {new Date(profile.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </div>

        {profile.socialLinks &&
          Object.entries(profile.socialLinks).some(([, v]) => Boolean(v)) && (
            <div className="mt-3 flex items-center gap-2">
              {(Object.keys(profile.socialLinks) as (keyof SocialLinks)[]).map((k) => {
                const handle = profile.socialLinks?.[k];
                if (!handle) return null;
                const href = socialUrl(k, handle);
                if (!href) return null;
                const Icon = SOCIAL_ICONS[k];
                return (
                  <a
                    key={k}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="p-2 rounded-lg bg-card/50 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-card/70 transition"
                    title={k}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-card/40 border border-border/20 py-3">
            <div className="text-lg font-semibold text-foreground">
              {profile.friendsCount}
            </div>
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1 justify-center">
              <Users className="h-3 w-3" /> Friends
            </div>
          </div>
          <div className="rounded-lg bg-card/40 border border-border/20 py-3">
            <div className="text-lg font-semibold text-foreground">
              {profile.postCount ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <div className="rounded-lg bg-card/40 border border-border/20 py-3">
            <div className="text-lg font-semibold text-foreground">
              {profile.likesCount ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Likes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
