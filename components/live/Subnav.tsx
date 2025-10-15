"use client";

import { useEffect, useRef, useState } from 'react';

type Tab = 'text' | 'voice' | 'videos';

// Pull-cord based subnav: a small handle under the header that can be clicked or dragged to reveal the bar.
export default function Subnav({ active, onChange, onPinnedChange }: { active: Tab; onChange: (t: Tab) => void; onPinnedChange?: (pinned: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const cordRef = useRef<HTMLButtonElement>(null);
  const startY = useRef<number | null>(null);
  const dragged = useRef(false);

  // Load persisted pin state and apply height var
  useEffect(() => {
    const v = localStorage.getItem('gt_subnav_pinned');
    const pin = v === '1';
    setPinned(pin);
    onPinnedChange?.(pin);
    document.documentElement.style.setProperty('--subnav-h', pin ? '56px' : '0px');
  }, [onPinnedChange]);

  // Keyboard accessibility: Alt+S toggles, Escape closes (if not pinned)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape' && !pinned) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinned]);

  // Listen for external set events from pull cord
  useEffect(() => {
    const onSet = (e: Event) => {
      const detail = (e as CustomEvent).detail as { open: boolean };
      if (typeof detail?.open === 'boolean') setOpen(detail.open);
      // also reflect dataset for other readers
      document.documentElement.dataset.subnavOpen = detail.open ? '1' : '0';
    };
    window.addEventListener('gt:subnav:set', onSet as EventListener);
    return () => window.removeEventListener('gt:subnav:set', onSet as EventListener);
  }, []);

  // Drag to open/close from the cord handle
  useEffect(() => {
    const el = cordRef.current;
    if (!el) return;
    const onPointerDown = (e: PointerEvent) => {
      dragged.current = false;
      startY.current = e.clientY;
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (startY.current == null) return;
      const dy = e.clientY - startY.current;
      if (Math.abs(dy) > 8) dragged.current = true;
      if (dy > 14) setOpen(true);
      if (dy < -14 && !pinned) setOpen(false);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragged.current) setOpen((v) => !v);
      startY.current = null;
      dragged.current = false;
    };
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
    };
  }, [pinned]);

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem('gt_subnav_pinned', next ? '1' : '0');
    onPinnedChange?.(next);
    document.documentElement.style.setProperty('--subnav-h', next ? '56px' : '0px');
    if (!next) setOpen(false);
  };

  // Reflect open state in dataset for external readers
  useEffect(() => {
    document.documentElement.dataset.subnavOpen = open || pinned ? '1' : '0';
  }, [open, pinned]);

  return (
    <>
      {/* Pull-cord handle centered under header */}
      {/* Pull cord now rendered separately by SubnavPullCord component */}

      {/* Subnav bar */}
      <nav
        className={`fixed left-0 right-0 top-[56px] z-49 transition-transform duration-200 ${open || pinned ? 'translate-y-0 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'}`}
      >
        <div className="bg-[color:var(--nav-bg)]/65 backdrop-blur-xl ring-1 ring-[color:var(--nav-border)]/20">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex h-12 items-center gap-6 text-sm">
              <TabButton label="Text Chat" active={active === 'text'} onClick={() => onChange('text')} />
              <TabButton label="Voice Chat" active={active === 'voice'} onClick={() => onChange('voice')} />
              <TabButton label="Tutorial Videos" active={active === 'videos'} onClick={() => onChange('videos')} />
              <div className="ml-auto flex items-center gap-2">
                <button onClick={togglePin} aria-pressed={pinned} className="px-2 py-1 rounded hover:bg-white/5">
                  {pinned ? '📌 Pinned' : '📌 Pin'}
                </button>
                {!pinned && (
                  <button onClick={() => setOpen(false)} className="px-2 py-1 rounded hover:bg-white/5">Hide</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-1.5 text-[rgba(220,235,255,0.9)] hover:text-white transition-colors ${
        active ? 'text-white' : ''
      }`}
      aria-selected={active}
      role="tab"
    >
      <span>{label}</span>
      <span
        className={`absolute -bottom-2 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full transition-opacity ${
          active ? 'opacity-100 bg-[hsl(var(--primary))]' : 'opacity-0'
        }`}
      />
    </button>
  );
}
