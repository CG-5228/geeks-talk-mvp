"use client";
import { Home, MessageSquareText, Headphones, Video, User } from 'lucide-react';

export default function WorkspaceRail() {
  const items = [
    { icon: Home, label: 'Home' },
    { icon: MessageSquareText, label: 'Text' },
    { icon: Headphones, label: 'Voice' },
    { icon: Video, label: 'Videos' },
    { icon: User, label: 'You' },
  ];
  return (
    <aside className="w-[72px] border-r border-[color:var(--nav-border)]/20 bg-[color:var(--nav-bg)]/50 backdrop-blur-xl flex flex-col items-center py-3 gap-3">
      {items.map(({ icon: Icon, label }) => (
        <button key={label} className="group size-10 rounded-lg bg-white/5 hover:bg-white/10 grid place-items-center ring-1 ring-[color:var(--nav-border)]/10" aria-label={label}>
          <Icon size={18} className="text-[rgba(236,245,255,0.9)]" />
        </button>
      ))}
    </aside>
  );
}
