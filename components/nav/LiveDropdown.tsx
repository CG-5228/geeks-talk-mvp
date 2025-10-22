"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare, Mic, Video, PlaySquare } from 'lucide-react';

interface Props {
  triggerRef: React.RefObject<HTMLElement>;
}

export default function LiveDropdown({ triggerRef }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelId] = useState(() => 'live-dropdown-' + Math.random().toString(36).slice(2));

  // Hover intent open/close with improved handling
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Also open on focus and click, toggle with Space/Enter
  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;

    const onFocus = () => setOpen(true);
    const onClick = (e: MouseEvent) => {
      // Treat as toggle; don't let Link navigation happen on button
      e.preventDefault();
      setOpen((v) => !v);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        (el as HTMLElement).focus();
      }
      if (open && (e.key === 'ArrowDown' || e.key === 'Down')) {
        e.preventDefault();
        focusItem(0);
      }
    };

    el.addEventListener('focus', onFocus);
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', onKey);
    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      el.removeEventListener('focus', onFocus);
      el.removeEventListener('click', onClick);
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [triggerRef, open]);

  // Close on click outside, escape, or route change
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(t) && !triggerRef.current?.contains(t as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [triggerRef]);

  useEffect(() => {
    setOpen(false);
  }, [pathname, params?.toString()]);

  // Positioning: center under trigger; flip if near edge; update on open/resize/scroll
  const [style, setStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const trigger = triggerRef.current as HTMLElement | null;
      const panel = panelRef.current as HTMLElement | null;
      if (!trigger || !panel) return;
      const rect = trigger.getBoundingClientRect();
      const panelW = Math.max(220, panel.offsetWidth || 260);
      const top = rect.bottom + 8; // fixed positioning
      let left = rect.left + rect.width / 2 - panelW / 2;
      const maxLeft = window.innerWidth - panelW - 8;
      const minLeft = 8;
      if (left < minLeft) left = minLeft;
      if (left > maxLeft) left = maxLeft;
      setStyle({ position: 'fixed', top, left, minWidth: panelW });
    };
    compute();
    const onScroll = () => compute();
    const onResize = () => compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [open, triggerRef]);

  // Keyboard roving + focus trap
  const items = useMemo(() => [
    { label: 'Text Chat', href: '/live', icon: MessageSquare },
    { label: 'Voice Chat', href: '/voice', icon: Mic },
    { label: 'Video Chat', href: '/video', icon: Video },
    { label: 'Tutorial Videos', href: '/live?tab=tutorials', icon: PlaySquare },
  ], []);
  const currentTab = pathname === '/voice' ? 'voice' : pathname === '/video' ? 'video' : pathname === '/live' ? 'text' : pathname.includes('tutorials') ? 'tutorials' : 'text';
  const listRef = useRef<HTMLDivElement>(null);

  const focusItem = (idx: number) => {
    const el = listRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']")[idx];
    el?.focus();
  };

  const onKeyDownList = (e: React.KeyboardEvent) => {
    const elts = listRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']");
    if (!elts || elts.length === 0) return;
    const activeIndex = Array.from(elts).findIndex((n) => n === document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem((activeIndex + 1) % elts.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem((activeIndex - 1 + elts.length) % elts.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusItem(elts.length - 1);
    } else if (e.key === 'Tab') {
      // Close if tabbing out
      if (e.shiftKey && activeIndex === 0) {
        e.preventDefault();
        setOpen(false);
        (triggerRef.current as HTMLElement | null)?.focus();
      } else if (!e.shiftKey && activeIndex === elts.length - 1) {
        e.preventDefault();
        setOpen(false);
        (triggerRef.current as HTMLElement | null)?.focus();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      (triggerRef.current as HTMLElement | null)?.focus();
    }
  };

  // Touch behavior: first tap opens, second tap activates an item
  useEffect(() => {
    const trigger = triggerRef.current as HTMLElement | null;
    if (!trigger) return;
    const onTouch = (e: TouchEvent) => {
      if (!open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    trigger.addEventListener('touchstart', onTouch, { passive: false });
    return () => trigger.removeEventListener('touchstart', onTouch);
  }, [triggerRef, open]);

  // Mobile sheet mode
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Expose open state to trigger for aria-expanded
  useEffect(() => {
    const t = triggerRef.current as HTMLElement | null;
    if (t) {
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      t.setAttribute('aria-controls', panelId);
      t.setAttribute('aria-haspopup', 'menu');
    }
  }, [open, triggerRef, panelId]);

  return (
    <div aria-hidden={!open}>
      <div
        ref={panelRef}
        id={panelId}
        role="menu"
        aria-label="Live menu"
        className={`fixed z-49 transition-all duration-150 ease-out motion-reduce:transition-none ${open ? 'opacity-100 translate-y-0 pointer-events-auto motion-reduce:translate-y-0' : 'opacity-0 -translate-y-1.5 pointer-events-none motion-reduce:translate-y-0'} ${isMobile ? 'left-0 right-0 top-14' : ''}`}
        style={isMobile ? undefined : style}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`rounded-xl backdrop-blur-2xl bg-[color:var(--nav-bg)]/95 ring-1 ring-[color:var(--nav-border)]/20 shadow-[0_10px_40px_rgba(0,0,0,.45)] min-w-[220px] ${isMobile ? 'mx-3' : ''}`}>
          <div className="mx-auto h-[3px] w-24 rounded-full bg-rose-500/90 -mt-1" />
          <div
            ref={listRef}
            className="p-2"
            onKeyDown={onKeyDownList}
          >
            {items.map((it) => {
              const Icon = it.icon;
              const active = (currentTab === 'voice' && it.href === '/voice') || 
                             (currentTab === 'video' && it.href === '/video') ||
                             (currentTab === 'text' && it.href === '/live') ||
                             (currentTab === 'tutorials' && it.href.includes('tab=tutorials'));
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  role="menuitem"
                  aria-current={active ? 'page' : undefined}
                  className="group flex items-center gap-3 px-4 py-3 text-[15px] text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-white/5 rounded-lg transition aria-[current=page]:text-white aria-[current=page]:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                  onClick={() => setOpen(false)}
                >
                  <Icon className="h-[18px] w-[18px] opacity-70 group-hover:opacity-90" />
                  <span>{it.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
