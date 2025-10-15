"use client";

import { useState } from 'react';

export default function ChatComposer({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState('');
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        onSend(text.trim());
        setText('');
      }
    }
  };
  return (
    <div className="border-t border-[color:var(--nav-border)]/20 p-3">
      <div className="rounded-lg ring-1 ring-[color:var(--card-ring)] bg-[color:var(--card-bg)]/70 backdrop-blur-xl">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write a message..."
          rows={1}
          disabled={disabled}
          className="w-full resize-none bg-transparent px-3 py-2 outline-none placeholder:text-[rgba(220,235,255,0.6)] text-[rgba(236,245,255,0.95)]"
        />
      </div>
      <div className="mt-2 text-xs text-[rgba(220,235,255,0.6)]">Press Enter to send • Shift+Enter for newline</div>
    </div>
  );
}
