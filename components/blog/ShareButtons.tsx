'use client';

import { useState } from 'react';
import { Check, Copy, Link as LinkIcon, Share2 } from 'lucide-react';

interface Props {
  title: string;
  url: string;
}

const XShareIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.447 20.452h-3.554V14.88c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.447-2.136 2.943v5.665H9.35V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.6 0 4.266 2.368 4.266 5.452v6.29zM5.337 7.433a2.062 2.062 0 01-2.063-2.064A2.062 2.062 0 015.337 3.3c1.14 0 2.065.925 2.065 2.065s-.925 2.068-2.065 2.068zm1.778 13.019H3.558V9h3.557v11.452z" />
  </svg>
);

export default function ShareButtons({ title, url }: Props) {
  const [copied, setCopied] = useState(false);

  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title,
          url,
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    copy();
  };

  const btnClass =
    'inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] text-[rgba(220,235,255,0.85)] hover:text-white hover:bg-white/[0.08] hover:border-[color:hsl(var(--primary)/0.4)] transition';

  return (
    <div className="flex items-center gap-2">
      <a
        href={`https://twitter.com/intent/tweet?text=${text}&url=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className={btnClass}
      >
        <XShareIcon className="w-4 h-4" />
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className={btnClass}
      >
        <LinkedInIcon className="w-4 h-4" />
      </a>
      <button type="button" onClick={copy} aria-label={copied ? 'Copied link' : 'Copy link'} className={btnClass}>
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
      </button>
      <button type="button" onClick={nativeShare} aria-label="Share" className={`${btnClass} md:hidden`}>
        <Share2 className="w-4 h-4" />
      </button>
      {copied && (
        <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
          <Copy className="w-3 h-3" /> Link copied
        </span>
      )}
    </div>
  );
}
