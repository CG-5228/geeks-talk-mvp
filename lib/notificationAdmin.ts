import {
  AlertTriangle,
  Bell,
  Flag,
  Mail,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type NotificationTypeKey =
  | 'admin_message'
  | 'ban'
  | 'system'
  | 'user_report'
  | 'unknown';

export interface NotificationTypeMeta {
  label: string;
  chip: string;
  icon: LucideIcon;
  accent: string;
}

export const NOTIFICATION_TYPE_META: Record<NotificationTypeKey, NotificationTypeMeta> = {
  admin_message: {
    label: 'Admin message',
    chip: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    icon: Mail,
    accent: 'text-sky-400',
  },
  ban: {
    label: 'Ban',
    chip: 'bg-red-500/15 text-red-300 border-red-500/30',
    icon: ShieldAlert,
    accent: 'text-red-400',
  },
  system: {
    label: 'System',
    chip: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    icon: AlertTriangle,
    accent: 'text-amber-300',
  },
  user_report: {
    label: 'User report',
    chip: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    icon: Flag,
    accent: 'text-orange-400',
  },
  unknown: {
    label: 'Notification',
    chip: 'bg-white/5 text-muted-foreground border-white/10',
    icon: Bell,
    accent: 'text-muted-foreground',
  },
};

export function resolveNotificationType(raw: string | null | undefined): NotificationTypeKey {
  if (!raw) return 'unknown';
  if (raw === 'admin_message' || raw === 'ban' || raw === 'system' || raw === 'user_report') {
    return raw;
  }
  return 'unknown';
}

export function notificationTypeLabel(raw: string | null | undefined): string {
  const key = resolveNotificationType(raw);
  if (key !== 'unknown') return NOTIFICATION_TYPE_META[key].label;
  if (!raw) return 'Notification';
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function notificationRelativeAge(createdAt: string | Date): string {
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

export function notificationAbsoluteDate(createdAt: string | Date): string {
  const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export { Sparkles };
