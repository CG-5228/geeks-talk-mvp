'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Megaphone,
  Send,
  Users,
  Wifi,
  CalendarClock,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';

type Audience = 'all' | 'online' | 'active-7d' | 'admins';

interface AudienceOption {
  value: Audience;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}

const AUDIENCES: AudienceOption[] = [
  { value: 'all', label: 'All users', hint: 'Every registered account', icon: Users },
  { value: 'online', label: 'Online now', hint: 'Currently online', icon: Wifi },
  { value: 'active-7d', label: 'Active (7d)', hint: 'Seen in last 7 days', icon: CalendarClock },
  { value: 'admins', label: 'Admins only', hint: 'Admin team', icon: Shield },
];

interface HistoryItem {
  id: string;
  action: string;
  summary: string | null;
  metadata: { audience?: string; recipients?: number; type?: string } | null;
  createdAt: string;
  admin: { id: string; name: string | null; email: string | null; image: string | null };
}

export default function BroadcastPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [type, setType] = useState('announcement');
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchPreview = useCallback(async (aud: Audience) => {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/admin/broadcast?mode=preview&audience=${aud}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('preview failed');
      const json = (await res.json()) as { count: number };
      setAudienceCount(json.count);
    } catch {
      setAudienceCount(null);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/admin/broadcast?mode=history', { cache: 'no-store' });
      if (!res.ok) throw new Error('history failed');
      const json = (await res.json()) as { items: HistoryItem[] };
      setHistory(json.items);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview(audience);
  }, [audience, fetchPreview]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const canSend =
    title.trim().length > 0 &&
    title.length <= 200 &&
    message.trim().length > 0 &&
    message.length <= 2000 &&
    !sending;

  const handleSend = async () => {
    if (!canSend) return;
    const targetDesc =
      audienceCount !== null
        ? `${audienceCount} user${audienceCount === 1 ? '' : 's'}`
        : `everyone in "${audience}"`;
    if (!confirm(`Send this broadcast to ${targetDesc}?`)) return;

    setSending(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), audience, type }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      setToast({
        kind: 'success',
        text: `Broadcast sent to ${json.sent ?? 0} user${json.sent === 1 ? '' : 's'}`,
      });
      setTitle('');
      setMessage('');
      fetchHistory();
    } catch (err) {
      setToast({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to send',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8">
      <AdminHeader
        title="Broadcast"
        description="Send a notification to users. Appears in their in-app notification list."
        icon={Megaphone}
        iconTone="warning"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Audience
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AUDIENCES.map((opt) => {
                const Icon = opt.icon;
                const active = audience === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAudience(opt.value)}
                    aria-pressed={active}
                    className={`text-left px-3 py-3 rounded-lg border transition-colors ${
                      active
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon
                        className={`h-4 w-4 ${
                          active ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                      <span className="text-sm font-medium text-foreground">{opt.label}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{opt.hint}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              {loadingPreview ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Counting recipients…
                </>
              ) : audienceCount !== null ? (
                <>
                  <Users className="h-3.5 w-3.5" /> {audienceCount} recipient
                  {audienceCount === 1 ? '' : 's'}
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-warning" /> Could not preview audience
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <div>
              <label
                htmlFor="broadcast-title"
                className="block text-xs font-medium text-muted-foreground mb-1.5"
              >
                Title
              </label>
              <input
                id="broadcast-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="e.g. Scheduled maintenance tonight"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
              />
              <div className="mt-1 text-[11px] text-muted-foreground text-right">
                {title.length}/200
              </div>
            </div>

            <div>
              <label
                htmlFor="broadcast-message"
                className="block text-xs font-medium text-muted-foreground mb-1.5"
              >
                Message
              </label>
              <textarea
                id="broadcast-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={6}
                placeholder="What do users need to know?"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 resize-y"
              />
              <div className="mt-1 text-[11px] text-muted-foreground text-right">
                {message.length}/2000
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="broadcast-type" className="text-xs text-muted-foreground">
                Type
              </label>
              <input
                id="broadcast-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                maxLength={40}
                className="flex-1 max-w-[200px] px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-md text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
              />
              <span className="text-[11px] text-muted-foreground">
                Custom tag users can filter by
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send broadcast
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Preview</h3>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground break-words">
                    {title || <span className="text-muted-foreground">Title preview</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                    {message || 'Message preview will appear here.'}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-2 uppercase tracking-wider">
                    {type || 'announcement'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Recent broadcasts</h3>
              <button
                type="button"
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {loadingHistory ? (
              <div className="text-xs text-muted-foreground">Loading…</div>
            ) : history.length === 0 ? (
              <div className="text-xs text-muted-foreground">No broadcasts yet.</div>
            ) : (
              <ul className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="text-xs">
                    <div className="text-foreground break-words">{h.summary}</div>
                    <div className="text-muted-foreground mt-0.5">
                      {h.admin.name ?? h.admin.email ?? 'admin'} ·{' '}
                      {new Date(h.createdAt).toLocaleString()}
                      {h.metadata?.audience && ` · ${h.metadata.audience}`}
                      {typeof h.metadata?.recipients === 'number' &&
                        ` · ${h.metadata.recipients} recipients`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 px-4 py-3 rounded-lg border text-sm shadow-lg ${
            toast.kind === 'success'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-error/30 bg-error/10 text-error'
          }`}
        >
          {toast.kind === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {toast.text}
        </div>
      )}
    </div>
  );
}
