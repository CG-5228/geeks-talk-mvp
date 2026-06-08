"use client";
import { useEffect, useRef, useState } from 'react';
import { X, Search } from 'lucide-react';

interface SearchResult {
  id: string;
  channelId: string;
  authorName: string;
  authorImage: string | null;
  content: string;
  createdAt: string;
}

interface SearchModalProps {
  channelId: string;
  channelName: string;
  onClose: () => void;
  onJumpTo: (messageId: string) => void;
}

export default function SearchModal({ channelId, channelName, onClose, onJumpTo }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/live/search?channelId=${encodeURIComponent(channelId)}&q=${encodeURIComponent(q)}`, {
        signal: ctl.signal,
      })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((data) => setResults(data.results || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      ctl.abort();
      clearTimeout(t);
    };
  }, [channelId, query]);

  const highlight = (text: string) => {
    const q = query.trim();
    if (!q) return text;
    const lower = text.toLowerCase();
    const needle = q.toLowerCase();
    const parts: Array<{ s: string; hit: boolean }> = [];
    let i = 0;
    while (i < text.length) {
      const idx = lower.indexOf(needle, i);
      if (idx === -1) {
        parts.push({ s: text.slice(i), hit: false });
        break;
      }
      if (idx > i) parts.push({ s: text.slice(i, idx), hit: false });
      parts.push({ s: text.slice(idx, idx + needle.length), hit: true });
      i = idx + needle.length;
    }
    return parts.map((p, k) =>
      p.hit ? (
        <mark key={k} className="bg-[color:hsl(var(--primary)/0.35)] text-[rgba(236,245,255,0.95)] rounded px-0.5">
          {p.s}
        </mark>
      ) : (
        <span key={k}>{p.s}</span>
      )
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-label={`Search in ${channelName}`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-xl rounded-2xl border border-border/30 bg-[color:var(--nav-bg)]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-12 border-b border-border/20">
          <Search className="w-4 h-4 text-[rgba(220,235,255,0.7)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
            placeholder={`Search in #${channelName}…`}
            className="flex-1 bg-transparent outline-none text-sm text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.5)]"
            aria-label="Search query"
          />
          <button onClick={onClose} aria-label="Close search" className="size-8 rounded-md hover:bg-white/5 grid place-items-center">
            <X className="w-4 h-4 text-[rgba(236,245,255,0.9)]" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <div className="p-6 text-sm text-[rgba(220,235,255,0.6)]">Type at least 2 characters to search.</div>
          ) : loading && results.length === 0 ? (
            <div className="p-6 text-sm text-[rgba(220,235,255,0.7)]">Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-6 text-sm text-[rgba(220,235,255,0.7)]">No matches found.</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onJumpTo(r.id);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[rgba(236,245,255,0.9)]">{r.authorName}</span>
                      <span className="text-[10px] text-[rgba(220,235,255,0.55)]">
                        {new Date(r.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-sm text-[rgba(236,245,255,0.85)] whitespace-pre-wrap break-words line-clamp-3">
                      {highlight(r.content.replace(/📎\s+.+/g, '').trim() || '(attachment)')}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
