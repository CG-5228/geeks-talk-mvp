'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  AtSign,
  ChevronDown,
  Loader2,
  Mail,
  MailX,
  Send,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';

import { useAdminToast } from '@/components/admin/AdminToast';

interface ReplyUser {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  image: string | null;
}

interface ReplyModalProps {
  userId: string;
  userName?: string;
  originalMessage?: string;
  onClose: () => void;
  onSent?: () => void;
}

const REPLY_TEMPLATES: Array<{ label: string; subject: string; body: string }> = [
  {
    label: 'Report received',
    subject: 'Re: Your report',
    body: 'Thanks for reporting this. We have received your report and it is now in our review queue. We will follow up here once the team has had a chance to investigate.',
  },
  {
    label: 'Action taken',
    subject: 'Update on your report',
    body: 'We reviewed your report and have taken action in line with our community guidelines. Thanks for helping us keep the community safe — please reach out again if you notice further issues.',
  },
  {
    label: 'No violation',
    subject: 'Update on your report',
    body: 'Thanks for your report. After reviewing it we did not find a violation of our community guidelines in this case. We appreciate you flagging it and encourage you to keep reporting anything that feels wrong.',
  },
  {
    label: 'Need more info',
    subject: 'Re: Your report — more detail needed',
    body: 'Thanks for the report. To help us investigate, could you share any additional context — links, screenshots, or the approximate time this happened? The more detail you can share, the faster we can resolve it.',
  },
  {
    label: 'Closed — thanks',
    subject: 'Your report has been closed',
    body: 'Closing out your report for now — thanks again for flagging it. Feel free to open a new report any time, and do not hesitate to reach out if something related comes up.',
  },
];

export default function ReplyModal({
  userId,
  userName,
  originalMessage,
  onClose,
  onSent,
}: ReplyModalProps) {
  const toast = useAdminToast();

  const [user, setUser] = useState<ReplyUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  const [subject, setSubject] = useState('Re: Your report');
  const [message, setMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingUser(true);
      setUserError(null);
      try {
        const res = await fetch(`/api/admin/users/${userId}/message`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load user');
        if (!cancelled) setUser(json.user);
      } catch (e) {
        if (!cancelled) setUserError(e instanceof Error ? e.message : 'Failed to load user');
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const displayName = user?.name || userName || user?.username || 'user';
  const recipientEmail = user?.email ?? null;

  const canSend = message.trim().length > 0 && subject.trim().length > 0 && !sending;

  const send = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, sendEmail }),
      });
      const json = await res.json();
      if (!res.ok && res.status !== 207) {
        throw new Error(json.error || 'Failed to send reply');
      }
      if (res.status === 207) {
        toast.push({
          title: 'Saved to inbox',
          description: 'Email delivery failed — the message is still visible to the user in-app.',
          tone: 'warning',
        });
      } else {
        toast.push({
          title: sendEmail ? 'Reply sent' : 'Note saved',
          description: sendEmail
            ? `Delivered to ${displayName}${recipientEmail ? ` · ${recipientEmail}` : ''}`
            : `Saved to ${displayName}'s inbox`,
          tone: 'success',
        });
      }
      onSent?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }, [canSend, userId, subject, message, sendEmail, toast, displayName, recipientEmail, onSent, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void send();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, send]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const applyTemplate = (t: (typeof REPLY_TEMPLATES)[number]) => {
    setSubject(t.subject);
    setMessage(t.body);
    setShowTemplates(false);
    requestAnimationFrame(() => messageRef.current?.focus());
  };

  const initial = useMemo(() => {
    const source = displayName || 'U';
    return source.trim().charAt(0).toUpperCase() || 'U';
  }, [displayName]);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Reply to ${displayName}`}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1b23] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-foreground">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">
                Reply to {displayName}
              </h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {loadingUser ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading recipient…
                  </span>
                ) : userError ? (
                  <span className="inline-flex items-center gap-1 text-red-300">
                    <AlertTriangle className="h-3 w-3" /> {userError}
                  </span>
                ) : (
                  <>
                    {recipientEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{recipientEmail}</span>
                      </span>
                    )}
                    {user?.username && (
                      <span className="inline-flex items-center gap-1">
                        <AtSign className="h-3 w-3" />
                        {user.username}
                      </span>
                    )}
                    {!recipientEmail && !user?.username && (
                      <span className="inline-flex items-center gap-1">
                        <UserIcon className="h-3 w-3" />
                        {userId}
                      </span>
                    )}
                  </>
                )}
              </div>
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

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {originalMessage && (
            <section>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Original message
              </h3>
              <div className="rounded-lg border border-white/5 bg-[#16181d] px-3 py-2 text-sm text-muted-foreground">
                <p className="whitespace-pre-wrap break-words">{originalMessage}</p>
              </div>
            </section>
          )}

          <section>
            <label
              htmlFor="reply-subject"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Subject
            </label>
            <input
              id="reply-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line"
              className="w-full rounded-lg border border-white/10 bg-[#16181d] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </section>

          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="reply-message"
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Message
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTemplates((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                >
                  <Sparkles className="h-3 w-3" />
                  Templates
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showTemplates && (
                  <div
                    className="absolute right-0 top-full z-10 mt-1 w-80 overflow-hidden rounded-lg border border-white/10 bg-[#1a1b23] py-1 shadow-xl"
                    onMouseLeave={() => setShowTemplates(false)}
                  >
                    {REPLY_TEMPLATES.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className="block w-full px-3 py-1.5 text-left text-xs text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                      >
                        <span className="font-medium text-foreground">{t.label}</span>
                        <span className="mt-0.5 block truncate opacity-70">{t.body}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <textarea
              id="reply-message"
              ref={messageRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Write your reply… (⌘↵ to send)"
              className="w-full resize-none rounded-lg border border-white/10 bg-[#16181d] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="tabular-nums">
                {message.length} {message.length === 1 ? 'char' : 'chars'}
              </span>
              {message.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessage('')}
                  className="transition hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          </section>

          <section>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-primary"
              />
              {sendEmail ? (
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <Mail className="h-3 w-3" />
                  Email reply to {recipientEmail || 'recipient'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <MailX className="h-3 w-3" />
                  Internal only — save to in-app inbox
                </span>
              )}
            </label>
            {sendEmail && !recipientEmail && !loadingUser && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-300">
                <AlertTriangle className="h-3 w-3" />
                No email on file — message will save to inbox only.
              </p>
            )}
          </section>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-white/10 bg-[#14161b] px-5 py-3">
          <span className="text-[11px] text-muted-foreground">
            {canSend ? (
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px]">
                  ⌘↵
                </kbd>
                to send
              </span>
            ) : !message.trim() ? (
              'Write a message to enable send'
            ) : (
              'Subject and message required'
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? 'Sending…' : sendEmail ? 'Send reply' : 'Save note'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
