"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Keyboard } from 'lucide-react';

type Section = {
  heading: string;
  items: Array<{ keys: string[]; label: string }>;
};

const SECTIONS: Section[] = [
  {
    heading: 'Navigation',
    items: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
      { keys: ['/'], label: 'Open command palette (when not typing)' },
      { keys: ['?'], label: 'Show keyboard shortcuts' },
      { keys: ['Esc'], label: 'Close any open overlay' },
    ],
  },
  {
    heading: 'Composer',
    items: [
      { keys: ['@'], label: 'Mention a member' },
      { keys: [':'], label: 'Insert an emoji by shortcode' },
      { keys: ['/'], label: 'Run a slash command (/me, /shrug, /help)' },
      { keys: ['Enter'], label: 'Send message' },
      { keys: ['Shift', 'Enter'], label: 'Insert a newline' },
      { keys: ['↑'], label: 'Edit your most recent message' },
      { keys: ['Esc'], label: 'Cancel reply / edit' },
    ],
  },
  {
    heading: 'Messages',
    items: [
      { keys: ['Click avatar'], label: 'Open profile menu' },
      { keys: ['Click bubble'], label: 'Open message actions (reply, edit, pin…)' },
      { keys: ['Drag files'], label: 'Drop into the room to upload' },
    ],
  },
  {
    heading: 'Autocomplete',
    items: [
      { keys: ['↑', '↓'], label: 'Navigate suggestions' },
      { keys: ['Enter'], label: 'Insert selected suggestion' },
      { keys: ['Tab'], label: 'Insert selected suggestion' },
      { keys: ['Esc'], label: 'Dismiss suggestions' },
    ],
  },
];

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-md border border-white/15 bg-white/[0.06] text-[11px] font-mono font-medium text-[rgba(236,245,255,0.95)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.2)]">
      {children}
    </kbd>
  );
}

export default function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-[1000] flex items-start justify-center pt-[10vh] px-4"
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-border/30 bg-[color:var(--nav-bg)]/95 backdrop-blur-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-[rgba(220,235,255,0.75)]" />
            <h2 className="text-sm font-semibold text-[rgba(236,245,255,0.95)]">Keyboard shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/[0.06] text-[rgba(220,235,255,0.7)] hover:text-white transition-colors"
            aria-label="Close shortcuts"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(220,235,255,0.55)] mb-2">
                {section.heading}
              </h3>
              <ul className="space-y-1.5">
                {section.items.map((item, i) => (
                  <li
                    key={`${section.heading}-${i}`}
                    className="flex items-center justify-between gap-4 text-xs text-[rgba(220,235,255,0.85)]"
                  >
                    <span className="min-w-0 truncate">{item.label}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, ki) => (
                        <KeyCap key={ki}>{k}</KeyCap>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-white/[0.06] text-[11px] text-[rgba(220,235,255,0.55)] flex items-center justify-between">
          <span>Press <KeyCap>?</KeyCap> anywhere to reopen this panel.</span>
          <span className="font-mono">Esc to close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Wires the `?` key (when not typing) and the `chat:open-shortcuts` custom
 * event (dispatched by the `/help` slash command) to open the modal.
 */
export function useShortcutsHotkey(onOpen: () => void) {
  useEffect(() => {
    const isTypingInto = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingInto(e.target)) return;
      e.preventDefault();
      onOpen();
    };
    const onCustom = () => onOpen();
    window.addEventListener('keydown', onKey);
    window.addEventListener('chat:open-shortcuts', onCustom as EventListener);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('chat:open-shortcuts', onCustom as EventListener);
    };
  }, [onOpen]);
}
