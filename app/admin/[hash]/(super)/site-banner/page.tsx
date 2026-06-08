'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Megaphone,
  Save,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Radio,
  Clock,
  Trash2,
  Power,
  PowerOff,
  Eye,
  Loader2,
  Signal,
  SignalZero,
  RefreshCw,
  Sparkles,
  Users,
  History,
  RotateCcw,
  MessageSquare,
  Circle,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminToast } from '@/components/admin/AdminToast';

// ---------- Types ----------

type Scope = 'MAIN' | 'LIVE';
type Variant = 'info' | 'warning' | 'danger' | 'success' | 'neutral';
type Behavior = 'PERSISTENT' | 'TIMED';

interface Announcement {
  id: string;
  scope: Scope;
  message: string;
  variant: string;
  behavior: Behavior;
  durationMs: number | null;
  isActive: boolean;
  dismissKey: string;
  createdAt?: string;
  updatedAt: string;
  _count?: { dismissals: number };
}

type Draft = {
  message: string;
  variant: Variant;
  behavior: Behavior;
  durationSeconds: number;
  isActive: boolean;
};

// ---------- Constants ----------

const MESSAGE_SOFT_LIMIT = 160;
const MESSAGE_HARD_LIMIT = 400;

const VARIANTS: Array<{
  value: Variant;
  label: string;
  icon: typeof Info;
  chip: string; // background+border classes for selected preview chip
  accent: string; // text color class
}> = [
  { value: 'info', label: 'Info', icon: Info, chip: 'bg-sky-500/15 border-sky-500/40', accent: 'text-sky-300' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, chip: 'bg-amber-500/15 border-amber-500/40', accent: 'text-amber-300' },
  { value: 'danger', label: 'Danger', icon: XCircle, chip: 'bg-red-500/15 border-red-500/40', accent: 'text-red-300' },
  { value: 'success', label: 'Success', icon: CheckCircle2, chip: 'bg-emerald-500/15 border-emerald-500/40', accent: 'text-emerald-300' },
  { value: 'neutral', label: 'Neutral', icon: Megaphone, chip: 'bg-white/10 border-white/20', accent: 'text-white/80' },
];

const TEMPLATES: Array<{ label: string; variant: Variant; behavior: Behavior; message: string; durationSeconds?: number }> = [
  {
    label: 'Scheduled maintenance',
    variant: 'warning',
    behavior: 'PERSISTENT',
    message: 'Scheduled maintenance this Sunday 02:00–04:00 UTC. Expect brief interruptions.',
  },
  {
    label: 'New feature launched',
    variant: 'success',
    behavior: 'TIMED',
    durationSeconds: 10,
    message: 'New feature just shipped — check it out in the dashboard.',
  },
  {
    label: 'Service degradation',
    variant: 'danger',
    behavior: 'PERSISTENT',
    message: 'We are investigating a service disruption. Follow our status page for live updates.',
  },
  {
    label: 'Heads-up / info',
    variant: 'info',
    behavior: 'PERSISTENT',
    message: 'Heads-up: a small quality-of-life update is coming this week.',
  },
  {
    label: 'Community event',
    variant: 'neutral',
    behavior: 'TIMED',
    durationSeconds: 15,
    message: 'Join tonight’s community meetup — link in the Discord #events channel.',
  },
];

const SCOPE_META: Record<Scope, { title: string; description: string; tag: string }> = {
  MAIN: {
    title: 'Main Site',
    description: 'Shown on the primary website (all non-live pages).',
    tag: 'geekstalk.org',
  },
  LIVE: {
    title: 'Live Subdomain',
    description: 'Shown on live.* pages (voice rooms, channels, DMs).',
    tag: 'live.geekstalk.org',
  },
};

// ---------- Helpers ----------

const normalizeVariant = (v: string | undefined): Variant => {
  const known: Variant[] = ['info', 'warning', 'danger', 'success', 'neutral'];
  return known.includes((v as Variant) ?? 'warning') ? (v as Variant) : 'warning';
};

const toDraft = (a: Announcement | null): Draft => ({
  message: a?.message ?? '',
  variant: normalizeVariant(a?.variant),
  behavior: a?.behavior ?? 'PERSISTENT',
  durationSeconds: a?.durationMs ? Math.max(1, Math.round(a.durationMs / 1000)) : 5,
  isActive: a?.isActive ?? true,
});

const draftsEqual = (a: Draft, b: Draft) =>
  a.message === b.message &&
  a.variant === b.variant &&
  a.behavior === b.behavior &&
  a.isActive === b.isActive &&
  (a.behavior !== 'TIMED' || a.durationSeconds === b.durationSeconds);

const relativeTime = (iso: string | undefined) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  if (abs < 60_000) return 'just now';
  if (abs < 3_600_000) return `${Math.round(abs / 60_000)} min ago`;
  if (abs < 86_400_000) return `${Math.round(abs / 3_600_000)} hr ago`;
  return `${Math.round(abs / 86_400_000)} day${abs >= 2 * 86_400_000 ? 's' : ''} ago`;
};

const isExpired = (a: Announcement | null): boolean => {
  if (!a) return false;
  if (a.behavior !== 'TIMED' || !a.durationMs) return false;
  const updatedMs = new Date(a.updatedAt).getTime();
  return Date.now() - updatedMs > a.durationMs;
};

// ---------- Page ----------

export default function SiteBannerPage() {
  const toast = useAdminToast();
  const [activeScope, setActiveScope] = useState<Scope>('MAIN');
  const [main, setMain] = useState<Announcement | null>(null);
  const [live, setLive] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sseConnected, setSseConnected] = useState({ MAIN: false, LIVE: false });

  const [mainDraft, setMainDraft] = useState<Draft>(toDraft(null));
  const [liveDraft, setLiveDraft] = useState<Draft>(toDraft(null));
  const mainBaseline = useRef<Draft>(toDraft(null));
  const liveBaseline = useRef<Draft>(toDraft(null));

  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  const current = activeScope === 'MAIN' ? main : live;
  const currentDraft = activeScope === 'MAIN' ? mainDraft : liveDraft;
  const setCurrentDraft = activeScope === 'MAIN' ? setMainDraft : setLiveDraft;
  const baseline = activeScope === 'MAIN' ? mainBaseline.current : liveBaseline.current;
  const isDirty = !draftsEqual(currentDraft, baseline);

  const applyFetched = useCallback((data: { main: Announcement | null; live: Announcement | null }) => {
    setMain(data.main);
    setLive(data.live);
    const mDraft = toDraft(data.main);
    const lDraft = toDraft(data.live);
    setMainDraft((prev) => (draftsEqual(prev, mainBaseline.current) ? mDraft : prev));
    setLiveDraft((prev) => (draftsEqual(prev, liveBaseline.current) ? lDraft : prev));
    mainBaseline.current = mDraft;
    liveBaseline.current = lDraft;
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [mRes, lRes] = await Promise.all([
        fetch('/api/admin/announcements?scope=main', { cache: 'no-store' }),
        fetch('/api/admin/announcements?scope=live', { cache: 'no-store' }),
      ]);
      const mData = mRes.ok ? await mRes.json() : { announcement: null };
      const lData = lRes.ok ? await lRes.json() : { announcement: null };
      applyFetched({ main: mData.announcement ?? null, live: lData.announcement ?? null });
    } catch (err) {
      console.error('Failed to fetch announcements', err);
      toast.push({ tone: 'error', title: 'Failed to load banners', description: 'Check connection and retry.' });
    } finally {
      setLoading(false);
    }
  }, [applyFetched, toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // SSE connection status + refetch on updates
  useEffect(() => {
    const sources: Record<Scope, EventSource | null> = { MAIN: null, LIVE: null };
    const openOne = (scope: Scope) => {
      const es = new EventSource(`/api/announcements/realtime?scope=${scope.toLowerCase()}`);
      es.onopen = () => setSseConnected((p) => ({ ...p, [scope]: true }));
      es.onerror = () => {
        setSseConnected((p) => ({ ...p, [scope]: false }));
      };
      es.onmessage = () => {
        fetchAll();
      };
      sources[scope] = es;
    };
    openOne('MAIN');
    openOne('LIVE');
    return () => {
      sources.MAIN?.close();
      sources.LIVE?.close();
    };
  }, [fetchAll]);

  // ⌘/Ctrl+S save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScope, currentDraft, saving]);

  const save = async (opts?: { resetDismissals?: boolean }) => {
    if (!currentDraft.message.trim()) {
      toast.push({ tone: 'warning', title: 'Message is required', description: 'Enter a message before saving.' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: activeScope.toLowerCase(),
          message: currentDraft.message.trim(),
          variant: currentDraft.variant,
          behavior: currentDraft.behavior,
          durationMs: currentDraft.behavior === 'TIMED' ? currentDraft.durationSeconds * 1000 : null,
          isActive: currentDraft.isActive,
          resetDismissals: opts?.resetDismissals ?? false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      await fetchAll();
      toast.push({
        tone: 'success',
        title: opts?.resetDismissals ? 'Saved & dismissals reset' : 'Banner saved',
        description: `${SCOPE_META[activeScope].title} banner is live.`,
      });
    } catch (err: any) {
      toast.push({ tone: 'error', title: 'Save failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    const b = activeScope === 'MAIN' ? mainBaseline.current : liveBaseline.current;
    setCurrentDraft(b);
  };

  const toggleActive = async () => {
    if (!current) return;
    const next = !current.isActive;
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: activeScope.toLowerCase(), isActive: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Toggle failed');
      await fetchAll();
      toast.push({ tone: next ? 'success' : 'info', title: next ? 'Banner activated' : 'Banner deactivated' });
    } catch (err: any) {
      toast.push({ tone: 'error', title: 'Toggle failed', description: err.message });
    }
  };

  const deleteBanner = async () => {
    if (!current) return;
    const confirmed = await toast.confirm({
      title: `Delete ${SCOPE_META[activeScope].title} banner?`,
      description: 'Removes the banner and clears all dismissal records. This cannot be undone.',
      confirmLabel: 'Delete banner',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/announcements?scope=${activeScope.toLowerCase()}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Delete failed');
      await fetchAll();
      toast.push({ tone: 'success', title: 'Banner deleted' });
    } catch (err: any) {
      toast.push({ tone: 'error', title: 'Delete failed', description: err.message });
    }
  };

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    setCurrentDraft({
      message: tpl.message,
      variant: tpl.variant,
      behavior: tpl.behavior,
      durationSeconds: tpl.durationSeconds ?? currentDraft.durationSeconds,
      isActive: true,
    });
  };

  const header = (
    <AdminHeader
      title="Site Banners"
      description="Broadcast platform-wide announcements to the main site and the live subdomain."
      icon={Megaphone}
      iconTone="warning"
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <SseStatusPill label="Main" connected={sseConnected.MAIN} />
          <SseStatusPill label="Live" connected={sseConnected.LIVE} />
          <button
            type="button"
            onClick={() => fetchAll()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
      }
    />
  );

  if (loading) {
    return (
      <div className="p-6">
        {header}
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-white/5 rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="h-[520px] bg-white/5 rounded-2xl" />
            <div className="h-[520px] bg-white/5 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {header}

      {/* Scope tabs */}
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-white/10 bg-[#16181d]/80 p-1.5 backdrop-blur-xl w-fit">
        {(['MAIN', 'LIVE'] as Scope[]).map((scope) => {
          const active = scope === activeScope;
          const snap = scope === 'MAIN' ? main : live;
          const dDraft = scope === 'MAIN' ? mainDraft : liveDraft;
          const dBase = scope === 'MAIN' ? mainBaseline.current : liveBaseline.current;
          const dirty = !draftsEqual(dDraft, dBase);
          const live_ = Boolean(snap && snap.isActive && !isExpired(snap));
          return (
            <button
              key={scope}
              type="button"
              onClick={() => setActiveScope(scope)}
              className={[
                'relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-white/70 hover:bg-white/5 hover:text-white border border-transparent',
              ].join(' ')}
              aria-pressed={active}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full ${
                    live_ ? 'bg-emerald-400 animate-ping opacity-75' : 'bg-white/25'
                  }`}
                />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${live_ ? 'bg-emerald-400' : 'bg-white/40'}`} />
              </span>
              {SCOPE_META[scope].title}
              {dirty && (
                <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)] gap-5">
        {/* Editor */}
        <EditorCard
          scope={activeScope}
          draft={currentDraft}
          setDraft={setCurrentDraft}
          saving={saving}
          isDirty={isDirty}
          hasExisting={Boolean(current)}
          onSave={() => save()}
          onSaveReset={() => save({ resetDismissals: true })}
          onDiscard={discard}
          onApplyTemplate={applyTemplate}
        />

        {/* Preview + status */}
        <div className="space-y-5">
          <PreviewCard draft={currentDraft} scope={activeScope} />
          <StatusCard
            announcement={current}
            scope={activeScope}
            onToggle={toggleActive}
            onDelete={deleteBanner}
          />
        </div>
      </div>

      <div className="mt-6">
        <TipsCard />
      </div>
    </div>
  );
}

// ---------- SSE Pill ----------

function SseStatusPill({ label, connected }: { label: string; connected: boolean }) {
  const Icon = connected ? Signal : SignalZero;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
        connected
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-white/10 bg-white/5 text-white/50'
      }`}
      title={connected ? 'Real-time updates connected' : 'Disconnected — changes may need a refresh'}
    >
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

// ---------- Editor Card ----------

interface EditorCardProps {
  scope: Scope;
  draft: Draft;
  setDraft: (d: Draft | ((prev: Draft) => Draft)) => void;
  saving: boolean;
  isDirty: boolean;
  hasExisting: boolean;
  onSave: () => void;
  onSaveReset: () => void;
  onDiscard: () => void;
  onApplyTemplate: (tpl: (typeof TEMPLATES)[number]) => void;
}

function EditorCard({
  scope,
  draft,
  setDraft,
  saving,
  isDirty,
  hasExisting,
  onSave,
  onSaveReset,
  onDiscard,
  onApplyTemplate,
}: EditorCardProps) {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!templatesOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setTemplatesOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [templatesOpen]);

  const len = draft.message.length;
  const overSoft = len > MESSAGE_SOFT_LIMIT;
  const overHard = len > MESSAGE_HARD_LIMIT;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#16181d]/80 p-6 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{SCOPE_META[scope].title} banner</h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-white/60">
              {SCOPE_META[scope].tag}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{SCOPE_META[scope].description}</p>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setTemplatesOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <Sparkles className="h-3.5 w-3.5" /> Templates
          </button>
          {templatesOpen && (
            <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-[#1a1b23] shadow-2xl">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => {
                    onApplyTemplate(tpl);
                    setTemplatesOpen(false);
                  }}
                  className="flex w-full items-start gap-3 border-b border-white/5 px-3 py-2.5 text-left transition hover:bg-white/5 last:border-0"
                >
                  <VariantDot variant={tpl.variant} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white">{tpl.label}</div>
                    <div className="truncate text-xs text-white/55">{tpl.message}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      <label className="block">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-white/60">Message</span>
          <span
            className={`text-[11px] tabular-nums ${
              overHard ? 'text-red-400' : overSoft ? 'text-amber-300' : 'text-white/45'
            }`}
          >
            {len}/{MESSAGE_SOFT_LIMIT}
          </span>
        </div>
        <textarea
          value={draft.message}
          onChange={(e) => setDraft({ ...draft, message: e.target.value.slice(0, MESSAGE_HARD_LIMIT) })}
          rows={3}
          placeholder="Short, direct message that applies site-wide. Use a blank line to separate title and body."
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 resize-y transition focus:border-primary/40 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="mt-1.5 text-[11px] text-white/40">
          Tip: Two newlines split the message into a bold title and body in the rendered banner.
        </p>
      </label>

      {/* Variant */}
      <div className="mt-5">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-white/60">Variant</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {VARIANTS.map((v) => {
            const Icon = v.icon;
            const selected = draft.variant === v.value;
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => setDraft({ ...draft, variant: v.value })}
                aria-pressed={selected}
                className={[
                  'group flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition',
                  selected
                    ? `${v.chip} ${v.accent}`
                    : 'border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/5 hover:text-white',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Behavior */}
      <div className="mt-5">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-white/60">Behavior</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <BehaviorCard
            selected={draft.behavior === 'PERSISTENT'}
            title="Persistent"
            desc="Stays visible until the user dismisses it."
            icon={Radio}
            onClick={() => setDraft({ ...draft, behavior: 'PERSISTENT' })}
          />
          <BehaviorCard
            selected={draft.behavior === 'TIMED'}
            title="Timed"
            desc="Auto-hides for each viewer after a fixed duration."
            icon={Clock}
            onClick={() => setDraft({ ...draft, behavior: 'TIMED' })}
          />
        </div>
        {draft.behavior === 'TIMED' && (
          <div className="mt-3 flex items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-xs text-white/60">Duration</span>
              <input
                type="number"
                min={1}
                max={300}
                value={draft.durationSeconds}
                onChange={(e) =>
                  setDraft({ ...draft, durationSeconds: Math.max(1, Math.min(300, parseInt(e.target.value) || 1)) })
                }
                className="w-24 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-foreground tabular-nums focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-xs text-white/60">seconds</span>
            </label>
            <div className="flex gap-1">
              {[5, 10, 20, 60].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft({ ...draft, durationSeconds: s })}
                  className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active toggle */}
      <div className="mt-5 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
        <div>
          <div className="text-sm font-medium text-foreground">Show this banner</div>
          <div className="text-xs text-muted-foreground">Turn off to keep the content but stop serving it.</div>
        </div>
        <ActiveToggle
          value={draft.isActive}
          onChange={(v) => setDraft({ ...draft, isActive: v })}
        />
      </div>

      {/* Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        <div className="text-xs text-white/50">
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <Circle className="h-2 w-2 fill-current" /> Unsaved changes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" /> Saved · <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono">⌘S</kbd>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isDirty && hasExisting && (
            <button
              type="button"
              onClick={onDiscard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" /> Discard
            </button>
          )}
          {hasExisting && (
            <button
              type="button"
              onClick={onSaveReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Save & reset dismissals
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !draft.message.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/25 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : hasExisting ? 'Save changes' : 'Create banner'}
          </button>
        </div>
      </div>
    </section>
  );
}

function BehaviorCard({
  selected,
  title,
  desc,
  icon: Icon,
  onClick,
}: {
  selected: boolean;
  title: string;
  desc: string;
  icon: typeof Radio;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'flex items-start gap-3 rounded-lg border p-3 text-left transition',
        selected
          ? 'border-primary/30 bg-primary/10'
          : 'border-white/10 bg-white/[0.02] hover:bg-white/5',
      ].join(' ')}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md ${
          selected ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/60'
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className={`text-sm font-medium ${selected ? 'text-primary' : 'text-foreground'}`}>{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}

function ActiveToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={[
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#16181d]',
        value ? 'bg-primary' : 'bg-white/15',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          value ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}

function VariantDot({ variant }: { variant: Variant }) {
  const v = VARIANTS.find((x) => x.value === variant) ?? VARIANTS[0];
  const Icon = v.icon;
  return (
    <span
      className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border ${v.chip} ${v.accent}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

// ---------- Preview Card ----------

function PreviewCard({ draft, scope }: { draft: Draft; scope: Scope }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#16181d]/80 p-5 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Live preview</h3>
        </div>
        <span className="text-[11px] text-white/45">{SCOPE_META[scope].tag}</span>
      </div>

      {/* Browser chrome mock */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0e12]">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.02] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
          <span className="ml-3 truncate text-[11px] text-white/40">{SCOPE_META[scope].tag}</span>
        </div>
        <div className="relative">
          {draft.message.trim() ? (
            <BannerPreview variant={draft.variant} message={draft.message} behavior={draft.behavior} />
          ) : (
            <div className="px-4 py-6 text-center text-xs text-white/35">Type a message to preview the banner</div>
          )}
          <div className="space-y-2 px-4 py-5 opacity-40">
            <div className="h-3 w-2/3 rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/10" />
            <div className="h-3 w-3/5 rounded bg-white/10" />
          </div>
        </div>
      </div>
    </section>
  );
}

function BannerPreview({
  variant,
  message,
  behavior,
}: {
  variant: Variant;
  message: string;
  behavior: Behavior;
}) {
  const v = VARIANTS.find((x) => x.value === variant) ?? VARIANTS[0];
  const Icon = v.icon;
  const [title, body] = splitMessage(message);
  const tones: Record<Variant, string> = {
    info: 'bg-sky-500/20 border-sky-500/60 text-sky-100',
    warning: 'bg-amber-500/20 border-amber-500/60 text-amber-50',
    danger: 'bg-red-500/20 border-red-500/60 text-red-100',
    success: 'bg-emerald-500/20 border-emerald-500/60 text-emerald-100',
    neutral: 'bg-white/10 border-white/25 text-white',
  };
  return (
    <div className={`relative w-full border-b ${tones[variant]} backdrop-blur-sm`}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 text-sm">
        <Icon className={`h-4 w-4 flex-shrink-0 ${v.accent}`} />
        <div className="min-w-0 flex-1 break-words">
          {title && <span className="font-semibold">{title}</span>}
          {title && body && <span className="opacity-60"> — </span>}
          {body && <span>{body}</span>}
        </div>
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded hover:bg-white/15">
          <XCircle className="h-3.5 w-3.5 opacity-60" />
        </span>
      </div>
      {behavior === 'TIMED' && (
        <div className="h-0.5 w-full overflow-hidden bg-black/20">
          <div className="h-full w-3/4 bg-white/50" />
        </div>
      )}
    </div>
  );
}

function splitMessage(msg: string): [string, string] {
  const [first, ...rest] = msg.split(/\n\s*\n/);
  if (rest.length === 0) return ['', first];
  return [first.trim(), rest.join('\n\n').trim()];
}

// ---------- Status Card ----------

function StatusCard({
  announcement,
  scope,
  onToggle,
  onDelete,
}: {
  announcement: Announcement | null;
  scope: Scope;
  onToggle: () => void;
  onDelete: () => void;
}) {
  if (!announcement) {
    return (
      <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
        <Megaphone className="mx-auto mb-2 h-6 w-6 text-white/30" />
        <div className="text-sm font-medium text-white/70">No {SCOPE_META[scope].title} banner yet</div>
        <p className="mt-1 text-xs text-white/45">Fill in the editor and save to publish one.</p>
      </section>
    );
  }

  const expired = isExpired(announcement);
  const isLive = announcement.isActive && !expired;
  const dismissCount = announcement._count?.dismissals ?? 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#16181d]/80 p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Current banner</h3>
          <span
            className={[
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
              isLive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : expired
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  : 'border-white/10 bg-white/5 text-white/60',
            ].join(' ')}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : expired ? 'bg-amber-400' : 'bg-white/50'}`} />
            {isLive ? 'Showing now' : expired ? 'Timer completed' : 'Off'}
          </span>
        </div>
        <span className="text-[11px] text-white/45" title={new Date(announcement.updatedAt).toLocaleString()}>
          <History className="mr-1 inline h-3 w-3" />
          {relativeTime(announcement.updatedAt)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Dismissals" value={dismissCount.toLocaleString()} icon={Users} />
        <StatTile
          label="Behavior"
          value={announcement.behavior === 'TIMED' ? `${Math.round((announcement.durationMs ?? 0) / 1000)}s` : 'Persistent'}
          icon={announcement.behavior === 'TIMED' ? Clock : Radio}
        />
        <StatTile
          label="Length"
          value={`${announcement.message.length} chars`}
          icon={MessageSquare}
        />
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-white/45">Dismiss key</div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-white/70">{announcement.dismissKey}</div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onToggle}
          className={[
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition',
            announcement.isActive
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
          ].join(' ')}
        >
          {announcement.isActive ? (
            <>
              <PowerOff className="h-4 w-4" /> Deactivate
            </>
          ) : (
            <>
              <Power className="h-4 w-4" /> Activate
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/50">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

// ---------- Tips Card ----------

function TipsCard() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#16181d]/60 p-5 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <Info className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Tips & behavior</h3>
      </div>
      <ul className="grid grid-cols-1 gap-2 text-sm text-white/70 md:grid-cols-2">
        <li className="flex items-start gap-2">
          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
          <span>Any content change auto-resets viewer dismissals so the new banner is seen by everyone.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
          <span>Timed banners auto-hide per-viewer; persistent banners stay until each viewer dismisses.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
          <span>Main and Live are independent — keep messages short and avoid duplicates across scopes.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
          <span>Banner updates stream to every open tab in real time over SSE — no refresh needed.</span>
        </li>
      </ul>
    </section>
  );
}
