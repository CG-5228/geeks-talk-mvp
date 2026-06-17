'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Flag,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';

interface FeatureFlag {
  id: string;
  key: string;
  label: string | null;
  description: string | null;
  enabled: boolean;
  rollout: number;
  audience: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/feature-flags', { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch failed');
      const json = (await res.json()) as { flags: FeatureFlag[] };
      setFlags(json.flags);
    } catch (err) {
      setToast({ kind: 'error', text: err instanceof Error ? err.message : 'Load failed' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const patchFlag = async (flag: FeatureFlag, patch: Partial<FeatureFlag>) => {
    setSaving(flag.id);
    try {
      const res = await fetch(`/api/admin/feature-flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? json.flag : f)));
    } catch (err) {
      setToast({ kind: 'error', text: err instanceof Error ? err.message : 'Update failed' });
    } finally {
      setSaving(null);
    }
  };

  const deleteFlag = async (flag: FeatureFlag) => {
    if (!confirm(`Delete flag "${flag.key}"? Code referencing it will fail-closed.`)) return;
    setSaving(flag.id);
    try {
      const res = await fetch(`/api/admin/feature-flags/${flag.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFlags((prev) => prev.filter((f) => f.id !== flag.id));
      setToast({ kind: 'success', text: `Deleted "${flag.key}"` });
    } catch (err) {
      setToast({ kind: 'error', text: err instanceof Error ? err.message : 'Delete failed' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-8">
      <AdminHeader
        title="Feature Flags"
        description="Gate experimental features, run staged rollouts, and kill-switch quickly."
        icon={Flag}
        iconTone="primary"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              New flag
            </button>
          </div>
        }
      />

      {loading && flags.length === 0 ? (
        <div className="animate-pulse grid grid-cols-1 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      ) : flags.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <FlagRow
              key={flag.id}
              flag={flag}
              saving={saving === flag.id}
              onPatch={(p) => patchFlag(flag, p)}
              onDelete={() => deleteFlag(flag)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateFlagModal
          onClose={() => setShowCreate(false)}
          onCreated={(flag) => {
            setFlags((prev) => [flag, ...prev]);
            setShowCreate(false);
            setToast({ kind: 'success', text: `Created "${flag.key}"` });
          }}
          onError={(msg) => setToast({ kind: 'error', text: msg })}
        />
      )}

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

function FlagRow({
  flag,
  saving,
  onPatch,
  onDelete,
}: {
  flag: FeatureFlag;
  saving: boolean;
  onPatch: (p: Partial<FeatureFlag>) => void;
  onDelete: () => void;
}) {
  const [localRollout, setLocalRollout] = useState(flag.rollout);

  useEffect(() => {
    setLocalRollout(flag.rollout);
  }, [flag.rollout]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-mono text-foreground">{flag.key}</code>
            {flag.label && (
              <span className="text-xs text-muted-foreground">· {flag.label}</span>
            )}
            <span
              className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded ${
                flag.enabled
                  ? 'bg-success/15 text-success'
                  : 'bg-white/5 text-muted-foreground'
              }`}
            >
              {flag.enabled ? 'on' : 'off'}
            </span>
            {flag.enabled && flag.rollout < 100 && (
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-warning/15 text-warning">
                {flag.rollout}% rollout
              </span>
            )}
          </div>
          {flag.description && (
            <p className="text-xs text-muted-foreground mt-1.5 break-words">{flag.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onPatch({ enabled: !flag.enabled })}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              flag.enabled ? 'bg-primary' : 'bg-white/10'
            } ${saving ? 'opacity-50' : ''}`}
            aria-label={flag.enabled ? 'Disable flag' : 'Enable flag'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                flag.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="p-1.5 rounded-md text-muted-foreground hover:text-error hover:bg-error/10 disabled:opacity-50"
            aria-label="Delete flag"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label className="text-xs text-muted-foreground whitespace-nowrap">Rollout</label>
        <input
          type="range"
          min={0}
          max={100}
          value={localRollout}
          onChange={(e) => setLocalRollout(Number(e.target.value))}
          onMouseUp={() => {
            if (localRollout !== flag.rollout) onPatch({ rollout: localRollout });
          }}
          onTouchEnd={() => {
            if (localRollout !== flag.rollout) onPatch({ rollout: localRollout });
          }}
          disabled={saving}
          className="flex-1 accent-primary"
        />
        <span className="text-xs text-foreground tabular-nums w-10 text-right">
          {localRollout}%
        </span>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
      <Flag className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <h3 className="text-sm font-medium text-foreground mb-1">No feature flags yet</h3>
      <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
        Create a flag to gate a feature, run a staged rollout, or keep a kill-switch ready for
        production.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-3.5 w-3.5" />
        Create first flag
      </button>
    </div>
  );
}

function CreateFlagModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: (flag: FeatureFlag) => void;
  onError: (msg: string) => void;
}) {
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [rollout, setRollout] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, label, description, enabled, rollout }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      onCreated(json.flag);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-background border border-white/10 rounded-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">New feature flag</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Keys are immutable. Use kebab-case (e.g. <code>new-chat-ui</code>).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Key *</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase())}
              placeholder="new-feature-ui"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Short human name"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this flag gate?"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/40"
              />
              Enabled
            </label>
          </div>
          <div>
            <label className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Rollout</span>
              <span className="tabular-nums text-foreground">{rollout}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={rollout}
              onChange={(e) => setRollout(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!key || submitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create flag
          </button>
        </div>
      </div>
    </div>
  );
}
