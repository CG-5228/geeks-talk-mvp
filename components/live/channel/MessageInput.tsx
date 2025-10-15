"use client";
import { useEffect, useRef, useState } from 'react';
import { Smile, Calculator } from 'lucide-react';
import dynamic from 'next/dynamic';
import data from '@emoji-mart/data';

// Optimize: import picker once at module level
const Picker = dynamic(() => import('@emoji-mart/react'), { ssr: false }) as any;
const CalculatorModal = dynamic(() => import('@/components/live/calculator/Calculator'), { ssr: false });

export interface MessageInputProps {
  onSendMessage: (text: string) => void;
  maxChars?: number;
  disabled?: boolean;
}

export default function MessageInput({ onSendMessage, maxChars = 500, disabled }: MessageInputProps) {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const remaining = Math.max(0, maxChars - text.length);
  const canSend = !disabled && text.trim().length > 0 && remaining >= 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    if (showEmoji) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmoji]);

  useEffect(() => {
    // simple auto-grow
    const el = taRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [text]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSendMessage(t);
    setText("");
    // keep focus
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const insertAtCaret = (content: string) => {
    const el = taRef.current; if (!el) return;
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + content + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + content.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const handleCalculatorResult = (result: string) => {
    insertAtCaret(result);
    setShowCalculator(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) send();
    }
  };

  return (
    <div className="px-4 pb-3">
      <div className="relative overflow-visible rounded-2xl bg-white/5 ring-1 ring-border/20 backdrop-blur-md p-2">
        <div className="flex items-end gap-2">
          {/* Emoji toggle on far left */}
          <div className="relative" ref={emojiRef}>
            <button
              className="p-2 rounded-xl hover:bg-white/5 text-[rgba(220,235,255,0.8)]"
              title="Emoji"
              onClick={() => setShowEmoji((s) => !s)}
            >
              <Smile className="h-4.5 w-4.5" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-[110%] left-0 z-[99]">
                <Picker
                  data={data as any}
                  onEmojiSelect={(e: any) => { insertAtCaret(e.native || ''); setShowEmoji(false); }}
                  theme="dark"
                  previewPosition="none"
                />
              </div>
            )}
          </div>

          {/* Calculator button */}
          <button
            className="p-2 rounded-xl hover:bg-white/5 text-[rgba(220,235,255,0.8)]"
            title="Calculator"
            onClick={() => setShowCalculator(true)}
          >
            <Calculator className="h-4.5 w-4.5" />
          </button>
          <div className="flex-1 min-w-0">
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message"
              rows={1}
              className="w-full resize-none bg-transparent outline-none text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.55)] min-h-[44px] max-h-40"
            />
          </div>
          <button
            onClick={send}
            disabled={!canSend}
            className={`ml-auto rounded-full px-4 py-2 text-sm font-medium transition ${canSend ? 'bg-[hsl(var(--primary))]/90 hover:bg-[hsl(var(--primary))] text-white' : 'bg-white/10 text-[rgba(220,235,255,0.6)] cursor-not-allowed'}`}
          >
            {`Send · ${remaining}`}
          </button>
        </div>
      </div>

      {/* Calculator Modal */}
      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        onResult={handleCalculatorResult}
      />
    </div>
  );
}
