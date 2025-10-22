"use client";
import Image from 'next/image';
import PresenceDot from '@/components/live/indicators/PresenceDot';

interface UserSummaryCardProps {
  user: {
    id: string;
    name: string;
    username?: string;
    image?: string | null;
    onlineStatus: 'online' | 'offline' | 'away';
    likesCount?: number;
  };
}

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23334155"/%3E%3Cpath d="M16 16a5 5 0 100-10 5 5 0 000 10zM8 24c0-4 3.6-7 8-7s8 3 8 7" fill="%23475569"/%3E%3C/svg%3E';

export default function UserSummaryCard({ user }: UserSummaryCardProps) {
  return (
    <div className="p-3 border-b border-white/10">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Image
            src={user.image || DEFAULT_AVATAR}
            alt={user.name}
            width={32}
            height={32}
            className="rounded-full"
            unoptimized={!user.image}
          />
          <PresenceDot 
            status={user.onlineStatus} 
            size="sm"
            className="absolute -bottom-0.5 -right-0.5"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[rgba(236,245,255,0.95)] truncate">
            {user.name}
          </div>
          {user.username && (
            <div className="text-sm text-[rgba(220,235,255,0.7)] truncate">
              @{user.username}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <div className="text-xs text-[rgba(220,235,255,0.6)]">
              {user.onlineStatus === 'online' ? 'Online' : 
               user.onlineStatus === 'away' ? 'Away' : 'Offline'}
            </div>
            {user.likesCount !== undefined && (
              <>
                <div className="w-1 h-1 bg-[rgba(220,235,255,0.3)] rounded-full" />
                <div className="text-xs text-[rgba(220,235,255,0.6)]">
                  {user.likesCount} likes
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
