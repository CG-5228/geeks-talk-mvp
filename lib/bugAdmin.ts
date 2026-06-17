import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  CircleSlash,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

export type BugSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BugStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type BugSort = 'newest' | 'oldest' | 'severity' | 'updated';

export const BUG_STATUSES: BugStatus[] = ['open', 'in-progress', 'resolved', 'closed'];
export const BUG_SEVERITIES: BugSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
export const BUG_SORTS: BugSort[] = ['newest', 'oldest', 'severity', 'updated'];

export const SEVERITY_META: Record<
  BugSeverity,
  { label: string; chip: string; dot: string; icon: LucideIcon; rank: number }
> = {
  CRITICAL: {
    label: 'Critical',
    chip: 'bg-red-500/15 text-red-300 border-red-500/30',
    dot: 'bg-red-400',
    icon: AlertOctagon,
    rank: 4,
  },
  HIGH: {
    label: 'High',
    chip: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    dot: 'bg-orange-400',
    icon: AlertTriangle,
    rank: 3,
  },
  MEDIUM: {
    label: 'Medium',
    chip: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    dot: 'bg-amber-300',
    icon: AlertCircle,
    rank: 2,
  },
  LOW: {
    label: 'Low',
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
    icon: CircleDot,
    rank: 1,
  },
};

export const STATUS_META: Record<
  BugStatus,
  { label: string; chip: string; icon: LucideIcon }
> = {
  open: {
    label: 'Open',
    chip: 'bg-red-500/15 text-red-300 border-red-500/30',
    icon: CircleDashed,
  },
  'in-progress': {
    label: 'In progress',
    chip: 'bg-primary/15 text-primary border-primary/30',
    icon: Loader2,
  },
  resolved: {
    label: 'Resolved',
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
  },
  closed: {
    label: 'Closed',
    chip: 'bg-white/5 text-muted-foreground border-white/10',
    icon: CircleSlash,
  },
};

export const SORT_LABELS: Record<BugSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  severity: 'Severity (high → low)',
  updated: 'Recently updated',
};

/**
 * SLA buckets are only relevant for bugs that are still open or in progress.
 * Resolved / closed bugs return `done` regardless of age.
 */
export type SlaBucket = 'fresh' | 'warning' | 'danger' | 'done';

export function slaBucket(status: BugStatus, createdAt: string | Date): SlaBucket {
  if (status === 'resolved' || status === 'closed') return 'done';
  const now = Date.now();
  const ts = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
  const hours = (now - ts) / (1000 * 60 * 60);
  if (hours >= 168) return 'danger'; // 7+ days open
  if (hours >= 48) return 'warning'; // 2+ days open
  return 'fresh';
}

export const SLA_CHIP: Record<SlaBucket, string> = {
  fresh: 'text-muted-foreground',
  warning: 'text-amber-300',
  danger: 'text-red-300 font-medium',
  done: 'text-muted-foreground',
};

/**
 * Compact human-readable age: "just now", "5m", "2h", "3d", "6w", "2mo", "1y".
 */
export function relativeAge(createdAt: string | Date): string {
  const ts = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
  const diff = Math.max(0, Date.now() - ts);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

export function absoluteDate(createdAt: string | Date): string {
  const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
