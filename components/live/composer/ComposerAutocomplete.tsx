"use client";
import Image from 'next/image';
import type { AnySuggestion, AutocompleteTrigger } from './autocomplete';

const DEFAULT_AVATAR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%23334155"/%3E%3Cpath d="M16 16a5 5 0 100-10 5 5 0 000 10zM8 24c0-4 3.6-7 8-7s8 3 8 7" fill="%23475569"/%3E%3C/svg%3E';

type Props = {
  items: AnySuggestion[];
  activeIndex: number;
  trigger: AutocompleteTrigger;
  query: string;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
};

function triggerLabel(trigger: AutocompleteTrigger): string {
  if (trigger === 'mention') return 'People';
  if (trigger === 'emoji') return 'Emoji';
  return 'Commands';
}

export default function ComposerAutocomplete({
  items,
  activeIndex,
  trigger,
  query,
  onSelect,
  onHover,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
        <div className="rounded-xl border border-border/30 bg-[color:var(--nav-bg)]/95 backdrop-blur-xl shadow-[0_20px_40px_-16px_rgba(0,0,0,0.6)] px-3 py-3 text-xs text-[rgba(220,235,255,0.6)]">
          {trigger === 'mention'
            ? `No members matching "${query}"`
            : trigger === 'emoji'
              ? `No emoji matching ":${query}"`
              : `No commands matching "/${query}"`}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
      <div
        role="listbox"
        aria-label={`${triggerLabel(trigger)} suggestions`}
        className="overflow-hidden rounded-xl border border-border/30 bg-[color:var(--nav-bg)]/95 backdrop-blur-xl shadow-[0_20px_40px_-16px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 text-[10px] font-semibold uppercase tracking-wider text-[rgba(220,235,255,0.5)]">
          <span>{triggerLabel(trigger)}</span>
          <span className="font-mono text-[10px] normal-case tracking-normal">
            ↑↓ navigate · enter insert · esc close
          </span>
        </div>
        <ul className="max-h-[240px] overflow-y-auto p-1">
          {items.map((item, idx) => {
            const isActive = idx === activeIndex;
            const base =
              'w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors cursor-pointer min-h-[40px]';
            const state = isActive
              ? 'bg-[hsl(var(--primary))]/15 ring-1 ring-[hsl(var(--primary))]/40 text-[rgba(236,245,255,0.98)]'
              : 'hover:bg-white/[0.04] text-[rgba(220,235,255,0.85)]';

            if (item.kind === 'mention') {
              return (
                <li
                  key={`m-${item.id}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(idx);
                  }}
                  onMouseEnter={() => onHover(idx)}
                  className={`${base} ${state}`}
                >
                  <span className="relative shrink-0">
                    <Image
                      src={item.image || DEFAULT_AVATAR}
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6 rounded-full object-cover"
                      unoptimized={!item.image}
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 block h-2 w-2 rounded-full ring-2 ring-[color:var(--nav-bg)] ${
                        item.onlineStatus === 'online'
                          ? 'bg-emerald-400'
                          : item.onlineStatus === 'away'
                            ? 'bg-amber-400'
                            : 'bg-slate-500'
                      }`}
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{item.name}</div>
                    <div className="truncate text-xs text-[rgba(220,235,255,0.55)]">
                      @{item.username}
                    </div>
                  </div>
                </li>
              );
            }
            if (item.kind === 'emoji') {
              return (
                <li
                  key={`e-${item.id}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(idx);
                  }}
                  onMouseEnter={() => onHover(idx)}
                  className={`${base} ${state}`}
                >
                  <span className="text-xl leading-none">{item.native}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">:{item.id}:</div>
                    <div className="truncate text-xs text-[rgba(220,235,255,0.55)]">
                      {item.name}
                    </div>
                  </div>
                </li>
              );
            }
            return (
              <li
                key={`s-${item.id}`}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(idx);
                }}
                onMouseEnter={() => onHover(idx)}
                className={`${base} ${state}`}
              >
                <span className="font-mono text-sm font-semibold text-[rgba(220,235,255,0.9)]">
                  {item.name}
                </span>
                <span className="flex-1 truncate text-xs text-[rgba(220,235,255,0.55)]">
                  {item.description}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
