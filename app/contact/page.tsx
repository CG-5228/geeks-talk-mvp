"use client";
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';
import { Instagram, Facebook } from 'lucide-react';

// Custom X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// Custom Discord icon component
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

// Custom YouTube icon component
const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export default function ContactPage() {
  const { data: session, status } = useSession();

  const [contact, setContact] = useState({ subject: '', message: '' });
  const [contactState, setContactState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [contactError, setContactError] = useState<string>('');

  const [bug, setBug] = useState({
    pagePath: '',
    title: '',
    steps: '',
    expected: '',
    actual: '',
    screenshotUrl: '',
    severity: 'MEDIUM',
  });
  const [bugState, setBugState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bugError, setBugError] = useState<string>('');

  const submitContact = async () => {
    setContactState('loading');
    setContactError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setContactState('success');
      setContact({ subject: '', message: '' });
    } catch (e: any) {
      setContactState('error');
      setContactError(e.message || 'Failed to send');
    }
  };

  const submitBug = async () => {
    setBugState('loading');
    setBugError('');
    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bug),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setBugState('success');
      setBug({ pagePath: '', title: '', steps: '', expected: '', actual: '', screenshotUrl: '', severity: 'MEDIUM' });
    } catch (e: any) {
      setBugState('error');
      setBugError(e.message || 'Failed to report');
    }
  };

  if (status === 'loading') {
    return <div className="min-h-[60vh] flex items-center justify-center text-[rgba(236,245,255,0.9)]">Loading…</div>;
  }

  if (!session?.user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold text-white">Contact Us</h1>
        <p className="mt-3 text-[rgba(220,235,255,0.85)]">Please <Link className="underline" href="/signin">sign in</Link> to use this feature.</p>
        <div className="mt-8 text-[rgba(220,235,255,0.85)]">Dev email: <a className="underline" href="mailto:chris.g@geekstalk.co">chris.g@geekstalk.co</a></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-white">Contact Us</h1>
      <p className="mt-2 text-[rgba(220,235,255,0.85)]">Send us a message, share your suggestions, or report a bug. We'll get back to you.</p>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact message */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0f10]/60 backdrop-blur-xl p-6">
          <h2 className="text-xl font-medium text-white">Send a message or suggestion</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm text-[rgba(220,235,255,0.85)]">Subject</label>
              <input
                className="mt-1 w-full rounded-md bg-white/5 text-white px-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                value={contact.subject}
                onChange={(e) => setContact((s) => ({ ...s, subject: e.target.value }))}
                placeholder="Subject"
              />
            </div>
            <div>
              <label className="block text-sm text-[rgba(220,235,255,0.85)]">Message</label>
              <textarea
                className="mt-1 w-full min-h-[140px] rounded-md bg-white/5 text-white px-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                value={contact.message}
                onChange={(e) => setContact((s) => ({ ...s, message: e.target.value }))}
                placeholder="Your message"
              />
            </div>
            {contactState === 'error' && <p className="text-sm text-red-400">{contactError}</p>}
            {contactState === 'success' && <p className="text-sm text-emerald-400">Message sent!</p>}
            <button
              onClick={submitContact}
              disabled={contactState === 'loading'}
              className="btn-primary rounded-md px-4 py-2 disabled:opacity-60"
            >{contactState === 'loading' ? 'Sending…' : 'Send'}</button>
          </div>
        </div>

        {/* Bug report */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0f10]/60 backdrop-blur-xl p-6">
          <h2 className="text-xl font-medium text-white">Report a bug</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm text-[rgba(220,235,255,0.85)]">Affected page/URL</label>
              <input
                className="mt-1 w-full rounded-md bg-white/5 text-white px-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                value={bug.pagePath}
                onChange={(e) => setBug((s) => ({ ...s, pagePath: e.target.value }))}
                placeholder="/live or full URL"
              />
            </div>
            <div>
              <label className="block text-sm text-[rgba(220,235,255,0.85)]">Title</label>
              <input
                className="mt-1 w-full rounded-md bg-white/5 text-white px-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                value={bug.title}
                onChange={(e) => setBug((s) => ({ ...s, title: e.target.value }))}
                placeholder="Short summary"
              />
            </div>
            <div>
              <label className="block text-sm text-[rgba(220,235,255,0.85)]">Steps to reproduce</label>
              <textarea
                className="mt-1 w-full min-h-[100px] rounded-md bg-white/5 text-white px-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                value={bug.steps}
                onChange={(e) => setBug((s) => ({ ...s, steps: e.target.value }))}
                placeholder="1) … 2) … 3) …"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[rgba(220,235,255,0.85)]">Expected</label>
                <textarea
                  className="mt-1 w-full min-h-[80px] rounded-md bg-white/5 text-white px-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                  value={bug.expected}
                  onChange={(e) => setBug((s) => ({ ...s, expected: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-[rgba(220,235,255,0.85)]">Actual</label>
                <textarea
                  className="mt-1 w-full min-h-[80px] rounded-md bg-white/5 text-white px-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                  value={bug.actual}
                  onChange={(e) => setBug((s) => ({ ...s, actual: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[rgba(220,235,255,0.85)]">Screenshot URL (optional)</label>
                <input
                  className="mt-1 w-full rounded-md bg-white/5 text-white px-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                  value={bug.screenshotUrl}
                  onChange={(e) => setBug((s) => ({ ...s, screenshotUrl: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label className="block text-sm text-[rgba(220,235,255,0.85)]">Severity</label>
                <div className="relative mt-1">
                  <select
                    className="appearance-none w-full rounded-lg bg-white/5 text-white px-3 pr-10 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-sm hover:bg-white/7 transition-colors"
                    value={bug.severity}
                    onChange={(e) => setBug((s) => ({ ...s, severity: e.target.value }))}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-4 w-4 text-white/70" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            {bugState === 'error' && <p className="text-sm text-red-400">{bugError}</p>}
            {bugState === 'success' && <p className="text-sm text-emerald-400">Bug reported!</p>}
            <button
              onClick={submitBug}
              disabled={bugState === 'loading'}
              className="btn-primary rounded-md px-4 py-2 disabled:opacity-60"
            >{bugState === 'loading' ? 'Submitting…' : 'Submit report'}</button>
          </div>
        </div>
      </div>

      {/* Social Media Footer */}
      <div className="mt-20 flex flex-col items-center space-y-6">
        {/* Social Media Icons */}
        <div className="flex items-center space-x-4">
          {/* Instagram */}
          <a
            href={process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center text-white hover:scale-110 transition-transform duration-200"
            title="Follow us on Instagram"
          >
            <Instagram className="w-6 h-6" />
          </a>

          {/* X (Twitter) */}
          <a
            href={process.env.NEXT_PUBLIC_X_URL || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white hover:scale-110 transition-transform duration-200"
            title="Follow us on X"
          >
            <XIcon className="w-6 h-6" />
          </a>

          {/* Discord */}
          <a
            href={process.env.NEXT_PUBLIC_DISCORD_URL || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-full bg-[#5865F2] flex items-center justify-center text-white hover:scale-110 transition-transform duration-200"
            title="Join our Discord"
          >
            <DiscordIcon className="w-6 h-6" />
          </a>

          {/* Facebook */}
          <a
            href={process.env.NEXT_PUBLIC_FACEBOOK_URL || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white hover:scale-110 transition-transform duration-200"
            title="Follow us on Facebook"
          >
            <Facebook className="w-6 h-6" />
          </a>

          {/* YouTube */}
          <a
            href={process.env.NEXT_PUBLIC_YOUTUBE_URL || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-full bg-[#FF0000] flex items-center justify-center text-white hover:scale-110 transition-transform duration-200"
            title="Subscribe to our YouTube channel"
          >
            <YouTubeIcon className="w-6 h-6" />
          </a>
        </div>

        {/* Dev Email */}
        <div className="text-[rgba(220,235,255,0.85)] text-sm">
          Dev email: <a className="underline hover:text-white transition-colors" href="mailto:chris.g@geekstalk.co">chris.g@geekstalk.co</a>
        </div>
      </div>
    </div>
  );
}


