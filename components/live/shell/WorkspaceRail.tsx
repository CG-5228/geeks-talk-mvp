"use client";
import { Home, Hash, MessageCircle, Grid } from 'lucide-react';

const items = [
  { icon: Home, label: 'Home' },
  { icon: Hash, label: 'Threads' },
  { icon: MessageCircle, label: 'DMs' },
  { icon: Grid, label: 'Apps' },
];

export default function WorkspaceRail() {
  return (
    <aside className="w-[56px] border-r border-[color:var(--nav-border)]/20 bg-[color:var(--nav-bg)]/50 backdrop-blur-xl flex flex-col items-center py-2 gap-2">
      {items.map(({ icon: Icon, label }) => (
        <button key={label} className="group size-10 rounded-lg bg-white/5 hover:bg-white/10 grid place-items-center ring-1 ring-[color:var(--nav-border)]/10" aria-label={label}>
          <Icon size={18} className="text-[rgba(236,245,255,0.9)]" />
        </button>
      ))}
    </aside>
  );
}
