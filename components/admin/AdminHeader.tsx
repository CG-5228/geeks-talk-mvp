import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconTone?: 'primary' | 'danger' | 'warning' | 'success' | 'info';
  actions?: ReactNode;
  meta?: ReactNode;
}

const toneMap: Record<NonNullable<AdminHeaderProps['iconTone']>, string> = {
  primary: 'bg-primary/10 border-primary/20 text-primary',
  danger: 'bg-error/10 border-error/20 text-error',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  success: 'bg-success/10 border-success/20 text-success',
  info: 'bg-info/10 border-info/20 text-info',
};

export default function AdminHeader({
  title,
  description,
  icon: Icon,
  iconTone = 'primary',
  actions,
  meta,
}: AdminHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${toneMap[iconTone]} flex-shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground truncate">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
          {meta && <div className="mt-2">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </header>
  );
}
