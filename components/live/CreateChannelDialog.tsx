"use client";

import { useState } from 'react';

export default function CreateChannelDialog({ onCreate, collapsed = false }: { onCreate: (name: string, topic?: string) => Promise<void>; collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const submit = async () => {
    if (!name.trim()) return;
    await onCreate(name.trim(), topic.trim() || undefined);
    setOpen(false); setName(''); setTopic('');
  };
  if (!open) {
    if (collapsed) {
      return (
        <button
          onClick={() => setOpen(true)}
          className="rounded p-2 hover:bg-white/10 inline-flex items-center justify-center w-10 h-10"
          aria-label="Create Channel"
          title="Create Channel"
        >
          <span className="text-xl leading-none">+</span>
        </button>
      );
    }
    return (
      <button onClick={() => setOpen(true)} className="w-full text-left rounded-md px-3 py-2 bg-white/5 hover:bg-white/10">
        + Create Channel
      </button>
    );
  }
  return (
    <div className="p-3">
      <div className="space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded px-2 py-1 bg-white/5" />
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (optional)" className="w-full rounded px-2 py-1 bg-white/5" />
        <div className="flex gap-2">
          <button onClick={submit} className="rounded px-3 py-1 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">Create</button>
          <button onClick={() => setOpen(false)} className="rounded px-3 py-1 bg-white/10">Cancel</button>
        </div>
      </div>
    </div>
  );
}
