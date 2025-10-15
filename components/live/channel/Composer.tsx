"use client";
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';
import { Smile } from 'lucide-react';

const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false });
const EmojiPicker = Picker as unknown as any;

export default function Composer({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const insertAtCaret = (str: string) => {
    const el = ref.current; if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + str + el.value.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + str.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMod = e.metaKey || e.ctrlKey;
    if (isMod && e.key.toLowerCase() === 'e') { e.preventDefault(); setOpen((v) => !v); return; }
    if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) { onSend(text.trim()); setText(''); }
    }
  };

  useEffect(() => {
    const onDocKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') e.preventDefault();
    };
    document.addEventListener('keydown', onDocKey);
    return () => document.removeEventListener('keydown', onDocKey);
  }, []);

  return (
    <div className="px-4 pt-3">
      <div className="relative rounded-xl p-3 bg-[linear-gradient(180deg,var(--surface-2),var(--surface-1))] ring-1 ring-[color:var(--divider)]/50 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,.35)]">
        <div className="flex items-end gap-2">
          <button aria-label="Emoji" onClick={() => setOpen((v) => !v)} className="shrink-0 rounded-md p-2 hover:bg-white/5 ring-1 ring-[color:var(--divider)]/40">
            <Smile size={16} className="text-[rgba(236,245,255,0.9)]" />
          </button>
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message…"
            rows={1}
            disabled={disabled}
            className="min-h-[40px] w-full resize-none bg-transparent px-2 py-2 outline-none placeholder:text-[rgba(220,235,255,0.6)] text-[rgba(236,245,255,0.95)]"
          />
        </div>
        {open && (
          <div className="absolute bottom-[calc(100%+8px)] left-0 z-50">
            <EmojiPicker data={data as any} onEmojiSelect={(e: any) => { insertAtCaret(e.native || ''); setOpen(false); }} theme="dark" previewPosition="none" />
          </div>
        )}
      </div>
      <div className="mt-2 text-xs text-[rgba(220,235,255,0.6)]">Press Enter to send • Shift+Enter for newline • ⌘/Ctrl+E for emoji</div>
    </div>
  );
}
