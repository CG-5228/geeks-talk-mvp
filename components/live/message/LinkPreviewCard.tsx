"use client";
import { useLinkPreview } from '@/lib/live/useLinkPreview';
import { ExternalLink } from 'lucide-react';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function LinkPreviewCard({ url, isOwnMessage }: { url: string; isOwnMessage?: boolean }) {
  const { preview, loading } = useLinkPreview(url);

  if (loading) {
    return (
      <div
        className={`mt-2 w-full max-w-md rounded-xl border border-white/[0.08] bg-black/10 p-3 animate-pulse ${
          isOwnMessage ? 'ml-auto' : ''
        }`}
      >
        <div className="h-3 w-24 bg-white/[0.1] rounded" />
        <div className="mt-2 h-4 w-3/4 bg-white/[0.1] rounded" />
        <div className="mt-1.5 h-3 w-full bg-white/[0.08] rounded" />
      </div>
    );
  }

  if (!preview || (!preview.title && !preview.description && !preview.image)) {
    return null;
  }

  const host = hostOf(preview.url);

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 flex w-full max-w-md overflow-hidden rounded-xl border border-white/[0.08] bg-black/15 hover:bg-black/20 transition-colors group ${
        isOwnMessage ? 'ml-auto' : ''
      }`}
      aria-label={`Open ${preview.title || host} in a new tab`}
    >
      {preview.image && (
        <div className="relative h-[88px] w-[88px] flex-shrink-0 bg-black/20 overflow-hidden">
          {/* Using <img> so we don't need domain allowlisting in next.config. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="min-w-0 flex-1 px-3 py-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-[rgba(220,235,255,0.55)]">
          <span className="truncate">{preview.siteName || host}</span>
          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>
        {preview.title && (
          <div className="mt-0.5 text-sm font-semibold text-[rgba(236,245,255,0.95)] line-clamp-2">
            {preview.title}
          </div>
        )}
        {preview.description && (
          <div className="mt-1 text-xs text-[rgba(220,235,255,0.65)] line-clamp-2">
            {preview.description}
          </div>
        )}
      </div>
    </a>
  );
}
