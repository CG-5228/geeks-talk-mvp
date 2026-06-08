import {
  Archive,
  Clock,
  Eye,
  Globe,
  Hash,
  Lock,
  MessageSquare,
  Pin,
  Shield,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';

/* ================================================================
 *  Channel admin — client helpers (pure, SSR-safe)
 *  ----------------------------------------------------------------
 *  Shared types, palettes, and small formatters used by both the
 *  channel list view and the channel detail subpage. Every chip/badge
 *  is intentionally borderless (tint background + colored text) to
 *  match the convention set in databaseAdmin.ts + filesAdmin.ts —
 *  never add a `border` class to these palettes.
 * ================================================================ */

export const CHANNEL_CATEGORIES = [
  'General',
  'Programming',
  'Mathematics',
  'Cybersecurity',
  'Computer General',
  'Private',
] as const;
export type ChannelCategory = (typeof CHANNEL_CATEGORIES)[number];

export type Visibility = 'public' | 'private';

export type ChannelTab =
  | 'overview'
  | 'messages'
  | 'members'
  | 'files'
  | 'settings'
  | 'audit';

export const CHANNEL_TABS: Array<{ value: ChannelTab; label: string; icon: LucideIcon }> = [
  { value: 'overview', label: 'Overview', icon: Eye },
  { value: 'messages', label: 'Messages', icon: MessageSquare },
  { value: 'members', label: 'Members', icon: Users },
  { value: 'files', label: 'Files', icon: Archive },
  { value: 'settings', label: 'Settings', icon: Star },
  { value: 'audit', label: 'Audit', icon: Shield },
];

export const MODERATION_STATUSES = ['pending', 'approved', 'flagged', 'rejected'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

// Borderless — tint + text only. See databaseAdmin.ts for the rationale.
const MODERATION_STYLES: Record<ModerationStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-300',
  approved: 'bg-emerald-500/10 text-emerald-300',
  flagged: 'bg-rose-500/10 text-rose-300',
  rejected: 'bg-red-500/10 text-red-300',
};

export function moderationMeta(status: string): { label: string; className: string } {
  const key = (MODERATION_STATUSES as readonly string[]).includes(status)
    ? (status as ModerationStatus)
    : 'pending';
  return {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    className: MODERATION_STYLES[key] ?? 'bg-white/5 text-muted-foreground',
  };
}

const CATEGORY_STYLES: Record<ChannelCategory, string> = {
  General: 'bg-sky-500/10 text-sky-300',
  Programming: 'bg-violet-500/10 text-violet-300',
  Mathematics: 'bg-emerald-500/10 text-emerald-300',
  Cybersecurity: 'bg-rose-500/10 text-rose-300',
  'Computer General': 'bg-teal-500/10 text-teal-300',
  Private: 'bg-amber-500/10 text-amber-300',
};

export function categoryStyle(category: string): string {
  const valid = (CHANNEL_CATEGORIES as readonly string[]).includes(category)
    ? (category as ChannelCategory)
    : null;
  return valid
    ? CATEGORY_STYLES[valid]
    : 'bg-white/5 text-muted-foreground';
}

export function visibilityMeta(v: string): { label: string; icon: LucideIcon; className: string } {
  if (v === 'private') {
    return { label: 'Private', icon: Lock, className: 'bg-amber-500/10 text-amber-300' };
  }
  return { label: 'Public', icon: Globe, className: 'bg-sky-500/10 text-sky-300' };
}

export function onlineMeta(status: string): { label: string; dot: string } {
  switch (status) {
    case 'online':
      return { label: 'Online', dot: 'bg-emerald-400' };
    case 'away':
      return { label: 'Away', dot: 'bg-amber-400' };
    case 'busy':
      return { label: 'Busy', dot: 'bg-rose-400' };
    default:
      return { label: 'Offline', dot: 'bg-white/20' };
  }
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '—';
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  if (abs < 60_000) return 'just now';
  const min = Math.floor(abs / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString();
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return Promise.resolve(false);
  }
  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch(() => false);
}

export const CHANNEL_PAGE_SIZES = [25, 50, 100, 200] as const;
export type ChannelPageSize = (typeof CHANNEL_PAGE_SIZES)[number];

export const MEMBER_ORDER_FIELDS = [
  { value: 'name' as const, label: 'Name' },
  { value: 'username' as const, label: 'Username' },
  { value: 'messages' as const, label: 'Messages' },
  { value: 'joinedAt' as const, label: 'Member since' },
];
export type MemberOrderField = (typeof MEMBER_ORDER_FIELDS)[number]['value'];

export const MESSAGE_MODERATION_FILTERS: Array<{ value: 'all' | ModerationStatus; label: string }> = [
  { value: 'all', label: 'All moderation' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'rejected', label: 'Rejected' },
];

export const MESSAGE_PINNED_FILTERS: Array<{ value: 'all' | 'pinned' | 'unpinned'; label: string }> = [
  { value: 'all', label: 'All pinned states' },
  { value: 'pinned', label: 'Pinned only' },
  { value: 'unpinned', label: 'Unpinned only' },
];

// Pin / clock shortcuts for overview cards.
export const METRIC_ICONS = {
  messages: MessageSquare,
  members: Users,
  pinned: Pin,
  clock: Clock,
  hash: Hash,
};
