import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

export type ContactStatus = 'new' | 'in-progress' | 'resolved';
export type ContactSort = 'newest' | 'oldest';

export const CONTACT_STATUSES: ContactStatus[] = ['new', 'in-progress', 'resolved'];
export const CONTACT_SORTS: ContactSort[] = ['newest', 'oldest'];

export const CONTACT_STATUS_META: Record<
  ContactStatus,
  { label: string; chip: string; icon: LucideIcon }
> = {
  new: {
    label: 'New',
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
};

export const CONTACT_SORT_LABELS: Record<ContactSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
};

export type ContactSlaBucket = 'fresh' | 'warning' | 'danger' | 'done';

export function contactSlaBucket(status: ContactStatus, createdAt: string | Date): ContactSlaBucket {
  if (status === 'resolved') return 'done';
  const now = Date.now();
  const ts = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
  const hours = (now - ts) / (1000 * 60 * 60);
  if (hours >= 72) return 'danger';
  if (hours >= 24) return 'warning';
  return 'fresh';
}

export const CONTACT_SLA_CHIP: Record<ContactSlaBucket, string> = {
  fresh: 'text-muted-foreground',
  warning: 'text-amber-300',
  danger: 'text-red-300 font-medium',
  done: 'text-muted-foreground',
};

export function contactRelativeAge(createdAt: string | Date): string {
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

export function contactAbsoluteDate(createdAt: string | Date): string {
  const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
