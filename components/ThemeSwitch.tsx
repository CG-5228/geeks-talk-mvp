'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { Check, Monitor } from 'lucide-react';
import { THEMES, displayName } from './theme/theme-config';

function ThemeSwatchIcon({ colors }: { colors?: string[] }) {
  if (!colors || colors.length === 0) {
    return (
      <span
        className="inline-block h-5 w-5 rounded-[5px] ring-1 ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
        style={{
          background:
            'linear-gradient(135deg, hsl(210 20% 92%) 0%, hsl(210 20% 92%) 50%, hsl(220 22% 10%) 50%, hsl(220 22% 10%) 100%)',
        }}
        aria-hidden
      />
    );
  }
  const c1 = colors[0];
  const c2 = colors[1] ?? colors[0];
  const c3 = colors[2] ?? colors[1] ?? colors[0];
  const c4 = colors[3] ?? colors[2] ?? colors[1] ?? colors[0];
  return (
    <span
      className="relative inline-grid h-5 w-5 grid-cols-2 grid-rows-2 overflow-hidden rounded-[5px] ring-1 ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
      aria-hidden
    >
      <span style={{ backgroundColor: c1 }} />
      <span style={{ backgroundColor: c2 }} />
      <span style={{ backgroundColor: c3 }} />
      <span style={{ backgroundColor: c4 }} />
    </span>
  );
}

export default function ThemeSwitch() {
  const { theme, resolvedTheme, systemTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!mounted) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--input-border))]/60 bg-[hsl(var(--nav-bg))]/60 backdrop-blur px-2 py-1.5 text-sm"
        aria-hidden
      >
        <span className="inline-block h-5 w-5 rounded-[5px] bg-white/10 ring-1 ring-white/10" />
      </div>
    );
  }

  const current = theme || 'system';
  const currentMeta = THEMES.find((t) => t.id === current);
  const currentLabel = displayName(current, resolvedTheme, systemTheme);

  const pick = (id: string) => {
    setTheme(id);
    setOpen(false);
    btnRef.current?.focus();
  };

  const nonSystemThemes = THEMES.filter((t) => t.id !== 'system');

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${currentLabel}. Click to change.`}
        title={currentLabel}
        className={[
          'inline-flex items-center justify-center rounded-full border backdrop-blur p-1.5 transition',
          'bg-[hsl(var(--nav-bg))]/60',
          'hover:border-[hsl(var(--primary))]/40 hover:shadow-[0_0_16px_hsl(var(--primary)/0.22)] hover:-translate-y-0.5',
          'active:translate-y-0 active:scale-[0.96]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]',
          open
            ? 'border-[hsl(var(--primary))]/60 shadow-[0_0_18px_hsl(var(--primary)/0.3)]'
            : 'border-[hsl(var(--input-border))]/60',
        ].join(' ')}
      >
        <ThemeSwatchIcon
          colors={currentMeta?.preview?.map((p) => p.color)}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select theme"
          className="absolute right-0 z-50 mt-2 w-[288px] rounded-2xl border border-white/[0.08] bg-[hsl(var(--nav-bg))]/95 backdrop-blur-xl shadow-2xl p-2 animate-fade-up"
          style={{ transformOrigin: 'top right' }}
        >
          <div className="grid grid-cols-2 gap-1.5">
            {nonSystemThemes.map((t) => {
              const selected = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(t.id)}
                  className={[
                    'group relative flex flex-col gap-2 rounded-xl p-2 text-left transition border',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/70',
                    selected
                      ? 'border-[hsl(var(--primary))]/60 bg-[hsl(var(--primary))]/10 shadow-[0_0_14px_hsl(var(--primary)/0.25)]'
                      : 'border-white/[0.06] hover:border-white/[0.2] hover:bg-white/[0.04] active:scale-[0.98]',
                  ].join(' ')}
                >
                  <div className="flex h-9 w-full overflow-hidden rounded-lg ring-1 ring-black/20">
                    {t.preview.map((p, i) => (
                      <span
                        key={i}
                        className="flex-1 transition-transform group-hover:scale-y-110"
                        style={{ backgroundColor: p.color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-xs font-semibold truncate"
                      style={{ color: 'hsl(var(--fg))' }}
                    >
                      {t.label}
                    </span>
                    {selected && (
                      <Check
                        className="h-3.5 w-3.5 flex-shrink-0"
                        style={{ color: 'hsl(var(--primary))' }}
                        aria-hidden
                      />
                    )}
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              role="option"
              aria-selected={theme === 'system'}
              onClick={() => pick('system')}
              className={[
                'group relative flex flex-col gap-2 rounded-xl p-2 text-left transition border',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/70',
                theme === 'system'
                  ? 'border-[hsl(var(--primary))]/60 bg-[hsl(var(--primary))]/10 shadow-[0_0_14px_hsl(var(--primary)/0.25)]'
                  : 'border-white/[0.06] hover:border-white/[0.2] hover:bg-white/[0.04] active:scale-[0.98]',
              ].join(' ')}
            >
              <div
                className="flex h-9 w-full items-center justify-center rounded-lg ring-1 ring-black/20"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(210 20% 96%) 0%, hsl(210 20% 96%) 50%, hsl(220 22% 8%) 50%, hsl(220 22% 8%) 100%)',
                }}
              >
                <Monitor className="h-4 w-4 text-white mix-blend-difference" aria-hidden />
              </div>
              <div className="flex items-center justify-between gap-1">
                <span
                  className="text-xs font-semibold truncate"
                  style={{ color: 'hsl(var(--fg))' }}
                >
                  {displayName('system', resolvedTheme, systemTheme)}
                </span>
                {theme === 'system' && (
                  <Check
                    className="h-3.5 w-3.5 flex-shrink-0"
                    style={{ color: 'hsl(var(--primary))' }}
                    aria-hidden
                  />
                )}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
