'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Database,
  HeartPulse,
  RefreshCw,
  Cpu,
  Clock,
  GitBranch,
  Globe,
  Users,
  MessageSquare,
  AlertTriangle,
  Bug,
  Mail,
  Server,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import StatsCard from '@/components/admin/StatsCard';

interface SystemHealth {
  timestamp: string;
  db: { ok: boolean; latencyMs: number | null };
  sessions: { activeSessionsHour: number; onlineUsers: number; totalUsers: number };
  traffic: { messagesLastHour: number; messagesLastDay: number };
  queues: { pendingReports: number; openBugs: number; unresolvedContact: number };
  totals: { messages: number; rooms: number };
  process: { memoryBytes: number | null; uptimeSeconds: number | null };
  build: {
    commitSha: string | null;
    branch: string | null;
    region: string | null;
    env: string;
    nodeVersion: string;
  };
}

function formatBytes(n: number | null): string {
  if (n === null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatUptime(s: number | null): string {
  if (s === null) return '—';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function latencyTone(ms: number | null): 'success' | 'warning' | 'error' {
  if (ms === null) return 'error';
  if (ms < 100) return 'success';
  if (ms < 500) return 'warning';
  return 'error';
}

export default function SystemHealthPage() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/admin/system/health', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SystemHealth;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      setRefreshing(true);
      load();
    }, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <AdminHeader
          title="System Health"
          description="Realtime platform and infrastructure signals."
          icon={HeartPulse}
          iconTone="primary"
        />
        <div className="rounded-xl border border-error/30 bg-error/5 p-6 text-sm text-error">
          Failed to load system health: {error ?? 'Unknown error'}
          <button
            type="button"
            onClick={onRefresh}
            className="ml-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-error/30 hover:bg-error/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const dbTone = data.db.ok ? latencyTone(data.db.latencyMs) : 'error';
  const queuesHealthy =
    data.queues.pendingReports === 0 &&
    data.queues.openBugs === 0 &&
    data.queues.unresolvedContact === 0;

  return (
    <div className="p-8">
      <AdminHeader
        title="System Health"
        description="Realtime platform and infrastructure signals."
        icon={HeartPulse}
        iconTone="primary"
        meta={
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  data.db.ok ? 'bg-success' : 'bg-error'
                }`}
              />
            </span>
            Last checked {new Date(data.timestamp).toLocaleTimeString()}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/40"
              />
              Auto-refresh
            </label>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      <section className="mb-6">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground/70 mb-3">
          Infrastructure
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <StatsCard
            title="Database"
            value={data.db.ok ? `${data.db.latencyMs ?? '—'} ms` : 'Unreachable'}
            icon={Database}
            tone={dbTone}
            hint={data.db.ok ? 'round-trip SELECT 1' : 'connection failed'}
          />
          <StatsCard
            title="Active sessions (1h)"
            value={data.sessions.activeSessionsHour}
            icon={Activity}
            tone="info"
            hint={`${data.sessions.onlineUsers} currently online`}
          />
          <StatsCard
            title="Memory (RSS)"
            value={formatBytes(data.process.memoryBytes)}
            icon={Cpu}
            tone="primary"
            hint={`uptime ${formatUptime(data.process.uptimeSeconds)}`}
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground/70 mb-3">
          Traffic
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <StatsCard
            title="Messages (1h)"
            value={data.traffic.messagesLastHour}
            icon={MessageSquare}
            tone="accent"
            hint="last hour throughput"
          />
          <StatsCard
            title="Messages (24h)"
            value={data.traffic.messagesLastDay}
            icon={MessageSquare}
            tone="info"
            hint="rolling 24h"
          />
          <StatsCard
            title="Total users"
            value={data.sessions.totalUsers}
            icon={Users}
            tone="primary"
            hint="registered accounts"
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground/70 mb-3">
          Operational queues
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <StatsCard
            title="Pending reports"
            value={data.queues.pendingReports}
            icon={AlertTriangle}
            tone={data.queues.pendingReports > 0 ? 'warning' : 'success'}
            hint={data.queues.pendingReports > 0 ? 'needs moderator review' : 'queue clear'}
          />
          <StatsCard
            title="Open bugs"
            value={data.queues.openBugs}
            icon={Bug}
            tone={data.queues.openBugs > 0 ? 'error' : 'success'}
            hint={data.queues.openBugs > 0 ? 'unresolved' : 'queue clear'}
          />
          <StatsCard
            title="Contact inbox"
            value={data.queues.unresolvedContact}
            icon={Mail}
            tone={data.queues.unresolvedContact > 0 ? 'warning' : 'success'}
            hint={queuesHealthy ? 'all clear' : 'new or in-progress'}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground/70 mb-3">
          Build
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <BuildRow icon={GitBranch} label="Commit">
              {data.build.commitSha ? (
                <code className="font-mono text-xs">{data.build.commitSha.slice(0, 10)}</code>
              ) : (
                <span className="text-muted-foreground">not set</span>
              )}
              {data.build.branch && (
                <span className="ml-2 text-muted-foreground">· {data.build.branch}</span>
              )}
            </BuildRow>
            <BuildRow icon={Globe} label="Environment">
              <span className="font-mono text-xs">{data.build.env}</span>
              {data.build.region && (
                <span className="ml-2 text-muted-foreground">· {data.build.region}</span>
              )}
            </BuildRow>
            <BuildRow icon={Server} label="Node">
              <span className="font-mono text-xs">{data.build.nodeVersion}</span>
            </BuildRow>
            <BuildRow icon={Clock} label="Last check">
              <span className="text-muted-foreground">
                {new Date(data.timestamp).toLocaleString()}
              </span>
            </BuildRow>
          </dl>
        </div>
      </section>
    </div>
  );
}

function BuildRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-foreground truncate">{children}</dd>
      </div>
    </div>
  );
}
