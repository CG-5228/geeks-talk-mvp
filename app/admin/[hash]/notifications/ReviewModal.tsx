'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  User as UserIcon,
  X,
} from 'lucide-react';

interface ReportUser {
  id: string;
  name: string;
  email: string;
}

interface ReportAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

interface ReportData {
  id: string;
  category: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  reporter: ReportUser;
  reported: ReportUser;
  reviewer?: ReportUser;
  attachments: ReportAttachment[];
}

interface ReviewModalProps {
  reportId: string;
  onClose: () => void;
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  reviewed: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  resolved: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
  dismissed: 'border-red-500/30 bg-red-500/15 text-red-300',
};

const CATEGORY_STYLE: Record<string, string> = {
  harassment: 'border-red-500/30 bg-red-500/15 text-red-300',
  spam: 'border-orange-500/30 bg-orange-500/15 text-orange-300',
  inappropriate: 'border-purple-500/30 bg-purple-500/15 text-purple-300',
  other: 'border-white/10 bg-white/5 text-muted-foreground',
};

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ReviewModal({ reportId, onClose }: ReviewModalProps) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load report');
      setData(json.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  const statusKey = data?.status ?? 'pending';
  const categoryKey = data?.category ?? 'other';

  return createPortal(
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Report details"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1b23] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">Report details</h2>
              <p className="truncate text-xs text-muted-foreground">
                Report ID · <span className="font-mono">{reportId.slice(0, 10)}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Loading report…</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Could not load report</p>
                <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground transition hover:bg-white/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-5">
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MetaCard label="Category" icon={<AlertTriangle className="h-3.5 w-3.5" />}>
                  <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${
                      CATEGORY_STYLE[categoryKey] ?? CATEGORY_STYLE.other
                    }`}
                  >
                    {titleCase(data.category)}
                  </span>
                </MetaCard>
                <MetaCard label="Status" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                  <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLE[statusKey] ?? STATUS_STYLE.pending
                    }`}
                  >
                    {titleCase(data.status)}
                  </span>
                </MetaCard>
                <MetaCard label="Submitted" icon={<Calendar className="h-3.5 w-3.5" />}>
                  <span className="text-xs text-foreground">
                    {new Date(data.createdAt).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </MetaCard>
              </section>

              <section className="rounded-lg border border-white/10 bg-[#16181d] p-4">
                <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" /> Reason
                </h3>
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                  {data.reason}
                </p>
                {data.description && (
                  <>
                    <h3 className="mb-2 mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Description
                    </h3>
                    <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {data.description}
                    </p>
                  </>
                )}
              </section>

              <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <UserCard
                  label="Reporter"
                  user={data.reporter}
                  accent="text-emerald-300"
                  accentBorder="border-emerald-500/30"
                />
                <UserCard
                  label="Reported user"
                  user={data.reported}
                  accent="text-red-300"
                  accentBorder="border-red-500/30"
                />
              </section>

              {data.attachments && data.attachments.length > 0 && (
                <section className="rounded-lg border border-white/10 bg-[#16181d] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> Attachments · {data.attachments.length}
                  </h3>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {data.attachments.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-white/5 bg-white/5 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground" title={a.fileName}>
                            {a.fileName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatFileSize(a.fileSize)}
                            {a.fileType ? ` · ${a.fileType}` : ''}
                          </p>
                        </div>
                        <a
                          href={`/api/admin/reports/attachments/${a.id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/20"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data.reviewer && (
                <section className="rounded-lg border border-white/10 bg-[#16181d] p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" /> Reviewed by
                  </h3>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-foreground">{data.reviewer.name}</span>
                    {data.reviewer.email && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{data.reviewer.email}</span>
                      </>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-white/10 bg-[#14161b] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function MetaCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#16181d] p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function UserCard({
  label,
  user,
  accent,
  accentBorder,
}: {
  label: string;
  user: ReportUser;
  accent: string;
  accentBorder: string;
}) {
  return (
    <div className={`rounded-lg border bg-[#16181d] p-4 ${accentBorder}`}>
      <h3 className={`mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${accent}`}>
        <UserIcon className="h-3.5 w-3.5" />
        {label}
      </h3>
      <p className="text-sm text-foreground">{user.name || 'Unknown user'}</p>
      {user.email && (
        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Mail className="h-3 w-3" />
          {user.email}
        </p>
      )}
    </div>
  );
}
