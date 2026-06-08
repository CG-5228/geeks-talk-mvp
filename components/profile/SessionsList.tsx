'use client';

import { useEffect, useState } from 'react';
import { Monitor, LogOut, Loader2, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Session = {
  id: string;
  expires: string | null;
  current: boolean;
  label?: string;
};

export default function SessionsList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mode, setMode] = useState<'database' | 'jwt'>('database');
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch('/api/user/sessions');
      const d = await r.json();
      if (Array.isArray(d.sessions)) setSessions(d.sessions);
      if (d.mode === 'jwt' || d.mode === 'database') setMode(d.mode);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function revoke(id: string) {
    setRevoking(id);
    setErr(null);
    try {
      const res = await fetch(`/api/user/sessions?id=${id}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || 'Failed to revoke');
        return;
      }
      if (d.revokedSelf) {
        window.location.href = '/signin';
        return;
      }
      await refresh();
    } finally {
      setRevoking(null);
    }
  }

  async function revokeOthers() {
    setRevokingAll(true);
    setErr(null);
    try {
      const res = await fetch(`/api/user/sessions?scope=others`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error || 'Failed to revoke');
        return;
      }
      await refresh();
    } finally {
      setRevokingAll(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border/20 bg-card/30 p-5 text-sm text-muted-foreground">
        Loading sessions…
      </div>
    );
  }

  const others = sessions.filter((s) => !s.current);

  return (
    <div className="rounded-xl border border-border/20 bg-card/30 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Active sessions</h3>
        {mode === 'database' && others.length > 0 && (
          <button
            onClick={revokeOthers}
            disabled={revokingAll}
            className="text-xs text-red-400 hover:text-red-300 transition disabled:opacity-50"
          >
            {revokingAll ? 'Revoking…' : 'Sign out all other devices'}
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/10 bg-background/20"
          >
            <Monitor className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-foreground truncate">
                {s.label || (s.current ? 'This device' : 'Other device')}
              </div>
              <div className="text-xs text-muted-foreground">
                {s.expires
                  ? `Expires ${formatDistanceToNow(new Date(s.expires), { addSuffix: true })}`
                  : 'Active session'}
              </div>
            </div>
            {s.current ? (
              <span className="text-xs text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                Current
              </span>
            ) : (
              <button
                onClick={() => revoke(s.id)}
                disabled={revoking === s.id}
                className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition disabled:opacity-50"
              >
                {revoking === s.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <LogOut className="h-3 w-3" />
                )}
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>

      {mode === 'jwt' && (
        <div className="flex gap-2 p-3 rounded-lg border border-border/10 bg-background/30 text-xs text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Your sessions use signed tokens (JWT), so we can only see the one on this device.
            To end a session on another device, sign out from that browser directly.
          </p>
        </div>
      )}

      {err && (
        <div role="status" aria-live="polite" className="text-xs text-red-400">
          {err}
        </div>
      )}
    </div>
  );
}
