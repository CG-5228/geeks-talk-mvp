'use client';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: LucideIcon;
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  hint?: string;
  className?: string;
}

const toneMap: Record<NonNullable<StatsCardProps['tone']>, { wrap: string; iconBg: string; icon: string }> = {
  primary: {
    wrap: 'border-primary/20 hover:border-primary/30',
    iconBg: 'bg-primary/10',
    icon: 'text-primary',
  },
  success: {
    wrap: 'border-success/20 hover:border-success/30',
    iconBg: 'bg-success/10',
    icon: 'text-success',
  },
  warning: {
    wrap: 'border-warning/20 hover:border-warning/30',
    iconBg: 'bg-warning/10',
    icon: 'text-warning',
  },
  error: {
    wrap: 'border-error/20 hover:border-error/30',
    iconBg: 'bg-error/10',
    icon: 'text-error',
  },
  info: {
    wrap: 'border-info/20 hover:border-info/30',
    iconBg: 'bg-info/10',
    icon: 'text-info',
  },
  accent: {
    wrap: 'border-accent/20 hover:border-accent/30',
    iconBg: 'bg-accent/10',
    icon: 'text-accent',
  },
};

export default function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  tone = 'primary',
  hint,
  className = '',
}: StatsCardProps) {
  const t = toneMap[tone];
  const ChangeIcon =
    change?.type === 'increase' ? TrendingUp : change?.type === 'decrease' ? TrendingDown : Minus;
  const changeColor =
    change?.type === 'increase'
      ? 'text-success'
      : change?.type === 'decrease'
      ? 'text-error'
      : 'text-muted-foreground';

  return (
    <div
      className={`p-5 rounded-xl border ${t.wrap} bg-white/[0.02] transition-colors ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-lg ${t.iconBg}`}>
          <Icon className={`h-5 w-5 ${t.icon}`} />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-medium ${changeColor}`}>
            <ChangeIcon className="h-3.5 w-3.5" />
            <span>{Math.abs(change.value)}%</span>
          </div>
        )}
      </div>

      <div>
        <div className="text-2xl font-bold text-foreground tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-sm text-muted-foreground mt-1">{title}</div>
        {hint && <div className="text-xs text-muted-foreground/70 mt-1">{hint}</div>}
      </div>
    </div>
  );
}
