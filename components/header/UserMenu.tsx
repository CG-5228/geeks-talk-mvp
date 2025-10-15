"use client";
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, Settings as SettingsIcon, LogOut, ChevronDown } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export default function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { 
      window.removeEventListener('keydown', onKey);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150); // Small delay to prevent flickering
  };

  if (!session?.user) return null;

  return (
    <div 
      className="relative" 
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full pl-0.5 pr-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/60 hover:bg-white/5 transition-colors"
      >
        <Image src={session.user.image || '/avatar.png'} alt="avatar" width={28} height={28} className="rounded-full" />
        <ChevronDown 
          size={16} 
          className={`text-[rgba(220,235,255,0.8)] transition-transform duration-200 ${
            open ? 'rotate-180' : 'rotate-0'
          }`} 
        />
      </button>
      {open && (
        <div 
          role="menu" 
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl bg-[color:var(--nav-bg)]/95 backdrop-blur-2xl ring-1 ring-[color:var(--nav-border)]/20 shadow-xl z-50"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="px-3 py-2 text-xs text-[rgba(220,235,255,0.7)]">Signed in as</div>
          <div className="px-3 pb-2 text-sm text-[rgba(236,245,255,0.95)] truncate">{session.user.email}</div>
          <div className="h-px bg-[color:var(--nav-border)]/20" />
          <div className="py-1 text-sm">
            <Link role="menuitem" href="/profile" className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors">
              <User size={16} />
              <span>Profile</span>
            </Link>
            <Link role="menuitem" href="/settings" className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors">
              <SettingsIcon size={16} />
              <span>Settings</span>
            </Link>
          </div>
          <div className="h-px bg-[color:var(--nav-border)]/20" />
          <button role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors" onClick={() => signOut({ callbackUrl: '/' })}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
