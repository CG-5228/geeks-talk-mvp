"use client";
import { useState } from 'react';

export default function ProfileForm({ initialUsername, email }: { initialUsername: string; email: string | null }) {
  const [username, setUsername] = useState(initialUsername);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const onSave = async () => {
    setPending(true); setError(null);
    const res = await fetch('/api/user/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to update');
    } else {
      setSavedAt(Date.now());
    }
    setPending(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1 text-[rgba(220,235,255,0.8)]">Username</label>
        <div className="flex gap-2">
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20 flex-1" />
          <button className="btn-primary rounded-md px-4" onClick={onSave} disabled={pending}>Save</button>
        </div>
        {error && <div className="mt-1 text-sm text-red-400">{error}</div>}
        {!error && savedAt && <div className="mt-1 text-sm text-green-400">Saved</div>}
      </div>
      <div>
        <label className="block text-sm mb-1 text-[rgba(220,235,255,0.8)]">Email</label>
        <input value={email || ''} readOnly className="rounded-md px-3 py-2 bg-white/5 ring-1 ring-[color:var(--nav-border)]/20 w-full opacity-80" />
      </div>
    </div>
  );
}
