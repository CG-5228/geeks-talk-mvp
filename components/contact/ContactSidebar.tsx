'use client';
import Link from 'next/link';
import { Clock, Globe2, Mail, ShieldCheck, Instagram, Facebook } from 'lucide-react';

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export interface SocialLinks {
  instagramUrl: string;
  xUrl: string;
  discordUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
}

interface Props {
  social: SocialLinks;
}

export default function ContactSidebar({ social }: Props) {
  return (
    <aside className="space-y-5">
      <div className="rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/50 backdrop-blur-xl p-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-semibold text-[rgba(220,235,255,0.6)]">
          <Clock className="w-3.5 h-3.5" /> Response time
        </div>
        <ul className="mt-3 space-y-2 text-sm text-[rgba(220,235,255,0.85)]">
          <li className="flex justify-between">
            <span>Support</span> <span className="text-[rgba(236,245,255,0.96)] font-medium">A few hours</span>
          </li>
          <li className="flex justify-between">
            <span>General / Feedback</span> <span className="text-[rgba(236,245,255,0.96)] font-medium">~1 day</span>
          </li>
          <li className="flex justify-between">
            <span>Partnership / Press</span>{' '}
            <span className="text-[rgba(236,245,255,0.96)] font-medium">~2 days</span>
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/50 backdrop-blur-xl p-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-semibold text-[rgba(220,235,255,0.6)]">
          <Globe2 className="w-3.5 h-3.5" /> Where we work
        </div>
        <div className="mt-3 text-sm text-[rgba(236,245,255,0.92)] font-medium">Remote · UTC-5 → UTC+8</div>
        <p className="mt-1 text-xs text-[rgba(220,235,255,0.65)] leading-relaxed">
          Our team spans the US, Europe, and Asia. If your message lands outside working hours, we’ll pick it up
          when the next timezone wakes up.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/50 backdrop-blur-xl p-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-semibold text-[rgba(220,235,255,0.6)]">
          <Mail className="w-3.5 h-3.5" /> Direct email
        </div>
        <a
          href="mailto:Chris.G@geekstalk.org"
          className="mt-3 block text-sm font-medium text-[color:hsl(var(--primary))] hover:underline break-all"
        >
          Chris.G@geekstalk.org
        </a>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-[rgba(220,235,255,0.55)]">
          <ShieldCheck className="w-3 h-3" />
          <span>Security issues: security@geekstalk.org</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/50 backdrop-blur-xl p-5">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[rgba(220,235,255,0.6)]">Follow us</div>
        <div className="mt-4 flex items-center gap-2.5">
          <Link
            href={social.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 grid place-items-center text-white hover:scale-105 transition"
          >
            <Instagram className="w-4 h-4" />
          </Link>
          <Link
            href={social.xUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            className="w-9 h-9 rounded-full bg-black grid place-items-center text-white hover:scale-105 transition border border-white/10"
          >
            <XIcon className="w-4 h-4" />
          </Link>
          <Link
            href={social.discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Discord"
            className="w-9 h-9 rounded-full bg-[#5865F2] grid place-items-center text-white hover:scale-105 transition"
          >
            <DiscordIcon className="w-4 h-4" />
          </Link>
          <Link
            href={social.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="w-9 h-9 rounded-full bg-[#1877F2] grid place-items-center text-white hover:scale-105 transition"
          >
            <Facebook className="w-4 h-4" />
          </Link>
          <Link
            href={social.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="w-9 h-9 rounded-full bg-[#FF0000] grid place-items-center text-white hover:scale-105 transition"
          >
            <YouTubeIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
