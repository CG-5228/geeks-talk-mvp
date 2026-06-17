"use client";
import { useEffect, useState } from 'react';

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

const inflight = new Map<string, Promise<LinkPreview | null>>();
const memory = new Map<string, LinkPreview | null>();

async function loadPreview(url: string): Promise<LinkPreview | null> {
  if (memory.has(url)) return memory.get(url) ?? null;
  const existing = inflight.get(url);
  if (existing) return existing;
  const p = (async () => {
    try {
      const res = await fetch(`/api/live/link-preview?url=${encodeURIComponent(url)}`, {
        credentials: 'same-origin',
      });
      if (res.status === 204 || !res.ok) {
        memory.set(url, null);
        return null;
      }
      const data = (await res.json()) as LinkPreview;
      memory.set(url, data);
      return data;
    } catch {
      memory.set(url, null);
      return null;
    } finally {
      inflight.delete(url);
    }
  })();
  inflight.set(url, p);
  return p;
}

export function useLinkPreview(url: string | null | undefined) {
  const [preview, setPreview] = useState<LinkPreview | null>(
    url ? memory.get(url) ?? null : null,
  );
  const [loading, setLoading] = useState<boolean>(url ? !memory.has(url) : false);
  useEffect(() => {
    if (!url) {
      setPreview(null);
      setLoading(false);
      return;
    }
    if (memory.has(url)) {
      setPreview(memory.get(url) ?? null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadPreview(url).then((data) => {
      if (cancelled) return;
      setPreview(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return { preview, loading };
}

const URL_RE = /\bhttps?:\/\/[^\s<>)"']+/gi;

export function extractFirstUrl(text: string): string | null {
  if (!text) return null;
  URL_RE.lastIndex = 0;
  const m = URL_RE.exec(text);
  if (!m) return null;
  let url = m[0];
  url = url.replace(/[)\].,;:!?]+$/, '');
  return url;
}
