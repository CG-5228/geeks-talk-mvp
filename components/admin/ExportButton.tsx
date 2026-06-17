'use client';
import { Download } from 'lucide-react';
import { downloadCSV } from '@/lib/csv';

type Scalar = string | number | boolean | null | undefined;

interface ExportButtonProps {
  filename: string;
  rows: Record<string, Scalar>[];
  disabled?: boolean;
  label?: string;
}

export default function ExportButton({
  filename,
  rows,
  disabled = false,
  label = 'Export CSV',
}: ExportButtonProps) {
  const handleClick = () => {
    if (disabled || rows.length === 0) return;
    const stamped = `${filename}-${new Date().toISOString().split('T')[0]}`;
    downloadCSV(stamped, rows);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 text-foreground border border-white/10 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="h-4 w-4" />
      {label}
      {rows.length > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">· {rows.length.toLocaleString()}</span>
      )}
    </button>
  );
}
