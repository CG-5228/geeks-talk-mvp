"use client";
import Image from 'next/image';
import type { LiveMessage } from '@/types/live';

// Default avatar as data URL to avoid 404s
const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23334155"/%3E%3Cpath d="M16 16a5 5 0 100-10 5 5 0 000 10zM8 24c0-4 3.6-7 8-7s8 3 8 7" fill="%23475569"/%3E%3C/svg%3E';

export default function MessageItem({ msg, showDivider }: { msg: LiveMessage; showDivider?: boolean }) {
  return (
    <div className={`relative group flex items-start gap-3 ${showDivider ? 'pt-4' : ''}`}>
      {showDivider && (
        <div className="absolute -top-2 left-0 right-0 h-px before:content-[''] before:block before:h-px before:bg-[radial-gradient(40%_120%_at_50%_50%,rgba(0,200,255,.35),transparent)] before:opacity-40" />
      )}
      <Image 
        src={msg.authorImage || DEFAULT_AVATAR} 
        alt={msg.authorName} 
        width={32} 
        height={32} 
        className="rounded-full flex-shrink-0"
        unoptimized={!msg.authorImage}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[rgba(236,245,255,0.95)]">{msg.authorName}</span>
          <span className="text-xs text-[rgba(220,235,255,0.7)]">{new Date(msg.createdAt).toLocaleTimeString()}</span>
        </div>
        <div className="text-[rgba(220,235,255,0.9)] whitespace-pre-wrap break-words">{msg.content}</div>
      </div>
    </div>
  );
}
