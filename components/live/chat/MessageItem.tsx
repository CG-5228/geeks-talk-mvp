"use client";

import Image from 'next/image';
import type { LiveMessage } from '@/types/live';

export default function MessageItem({ msg }: { msg: LiveMessage }) {
  return (
    <div className="group flex items-start gap-3">
      <Image src={msg.authorImage || '/avatar.png'} alt="avatar" width={32} height={32} className="rounded-full" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[rgba(236,245,255,0.95)]">{msg.authorName}</span>
          <span className="text-xs text-[rgba(220,235,255,0.7)]">{new Date(msg.createdAt).toLocaleTimeString()}</span>
          <button className="ml-auto opacity-0 group-hover:opacity-100 text-xs rounded px-2 py-0.5 bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]">Follow</button>
        </div>
        <div className="text-[rgba(220,235,255,0.9)] whitespace-pre-wrap break-words">{msg.content}</div>
      </div>
    </div>
  );
}
