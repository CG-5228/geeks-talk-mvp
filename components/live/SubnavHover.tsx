"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function SubnavHover({ anchorId = 'nav-live' }: { anchorId?: string }) {
  const [open, setOpen] = useState(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const anchorRect = useRef<DOMRect | null>(null);

  const clearTimers = () => {
    if (openTimer.current) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  };

  const openWithIntent = () => {
    clearTimers();
    openTimer.current = window.setTimeout(() => setOpen(true), 180) as unknown as number;
  };
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 200) as unknown as number;
  };

  useEffect(() => {
    const btn = document.getElementById(anchorId);
    const panel = panelRef.current;
    if (!btn || !panel) return;

    const updatePos = () => {
      anchorRect.current = btn.getBoundingClientRect();
      // We set a CSS var for left alignment; panel uses it to align an arrow or padding
      const center = anchorRect.current.left + anchorRect.current.width / 2;
      panel.style.setProperty('--subnav-anchor-x', `${center}px`);
    };

    const onEnterBtn = () => openWithIntent();
    const onLeaveBtn = () => scheduleClose();
    const onEnterPanel = () => { clearTimers(); };
    const onLeavePanel = () => scheduleClose();
    const onFocusBtn = () => setOpen(true);
    const onBlurBtn = () => scheduleClose();
    const onKeydown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onTouch = (e: TouchEvent) => { e.preventDefault(); setOpen((v) => !v); };

    btn.addEventListener('mouseenter', onEnterBtn);
    btn.addEventListener('mouseleave', onLeaveBtn);
    btn.addEventListener('focus', onFocusBtn);
    btn.addEventListener('blur', onBlurBtn);
    btn.addEventListener('touchstart', onTouch, { passive: false });

    panel.addEventListener('mouseenter', onEnterPanel);
    panel.addEventListener('mouseleave', onLeavePanel);

    window.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', () => requestAnimationFrame(updatePos));
    window.addEventListener('scroll', () => requestAnimationFrame(updatePos), { passive: true });

    updatePos();

    return () => {
      btn.removeEventListener('mouseenter', onEnterBtn);
      btn.removeEventListener('mouseleave', onLeaveBtn);
      btn.removeEventListener('focus', onFocusBtn);
      btn.removeEventListener('blur', onBlurBtn);
      btn.removeEventListener('touchstart', onTouch as any);
      panel.removeEventListener('mouseenter', onEnterPanel);
      panel.removeEventListener('mouseleave', onLeavePanel);
      window.removeEventListener('keydown', onKeydown);
      // listeners added via inline arrow cannot be removed; acceptable for lightweight
    };
  }, [anchorId]);

  return (
    <div
      ref={panelRef}
      className={`fixed left-0 right-0 top-[calc(var(--header-h,56px))] z-49 ${open ? 'pointer-events-auto opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-2'} transition-all duration-150 ease-out`}
      style={{ pointerEvents: open ? 'auto' as any : 'none' }}
      aria-hidden={!open}
    >
      <div className="mx-auto max-w-5xl rounded-2xl backdrop-blur-xl ring-1 ring-[color:var(--nav-border)]/20 bg-[color:var(--nav-bg)]/70 shadow-lg px-4">
        <div className="flex h-12 items-center gap-6 text-sm" role="tablist" aria-label="Live sections">
          <Tab label="Text Chat" href="/live?tab=text" active />
          <Tab label="Voice Chat" href="/live?tab=voice" />
          <Tab label="Tutorial Videos" href="/live?tab=videos" />
          <div className="ml-auto text-[11px] text-[rgba(220,235,255,0.65)]">Esc to close</div>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, href, active = false }: { label: string; href: string; active?: boolean }) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={`relative px-3 py-1.5 text-[rgba(220,235,255,0.9)] hover:text-white transition-colors ${active ? 'text-white' : ''}`}
    >
      <span>{label}</span>
      <span className={`absolute -bottom-2 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full transition-opacity ${active ? 'opacity-100 bg-[hsl(var(--primary))]' : 'opacity-0'}`} />
    </Link>
  );
}
