'use client';
import { X } from 'lucide-react';

interface BulkAction {
  label: string;
  onClick: () => void | Promise<void>;
  tone?: 'primary' | 'success' | 'error' | 'neutral';
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  actions: BulkAction[];
  label?: string;
}

const TONE_CLS: Record<NonNullable<BulkAction['tone']>, string> = {
  primary: 'bg-primary/20 hover:bg-primary/30 text-foreground border-primary/30',
  success: 'bg-success/20 hover:bg-success/30 text-success border-success/30',
  error: 'bg-error/20 hover:bg-error/30 text-error border-error/30',
  neutral: 'bg-white/5 hover:bg-white/10 text-foreground border-white/10',
};

export default function BulkActionBar({ count, onClear, actions, label = 'selected' }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="sticky top-0 z-20 -mx-6 px-6 mb-4">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm text-foreground tabular-nums">
            <strong className="font-semibold">{count.toLocaleString()}</strong>{' '}
            <span className="text-muted-foreground">{label}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                disabled={a.disabled}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${TONE_CLS[a.tone ?? 'neutral']}`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
