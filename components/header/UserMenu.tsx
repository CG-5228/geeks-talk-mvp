"use client";
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, Settings as SettingsIcon, LogOut, ChevronDown } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import NotificationBell from './NotificationBell';

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
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl bg-black/80 backdrop-blur-md border border-white/15 shadow-2xl z-50"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="px-3 py-2 text-xs text-[rgba(220,235,255,0.7)]">Signed in as</div>
          <div className="px-3 pb-2 text-sm text-[rgba(236,245,255,0.95)] truncate">{session.user.email}</div>
          <div className="h-px bg-white/10" />
          <div className="py-1 text-sm">
            <Link role="menuitem" href="/profile" className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white/90 transition-colors">
              <User size={16} />
              <span>Profile</span>
            </Link>
            <Link role="menuitem" href="/notifications" className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white/90 transition-colors">
              <NotificationBell className="h-4 w-4" />
              <span>Notifications</span>
            </Link>
            <Link role="menuitem" href="/settings" className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white/90 transition-colors">
              <SettingsIcon size={16} />
              <span>Settings</span>
            </Link>
          </div>
          <div className="h-px bg-white/10" />
          <button role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10 text-white/90 transition-colors" onClick={async () => {

            try {
              // Update user status before signing out
              await fetch('/api/user/logout', { method: 'POST' });
              await signOut({ callbackUrl: '/' });

            } catch (error) {
              console.error('Sign out error:', error);
            }
          }}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
