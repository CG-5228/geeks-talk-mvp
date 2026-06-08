'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  MessageSquare,
  Bug,
  Send,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Timer,
  Users,
} from 'lucide-react';
import ParticlesBackgroundClient from '@/components/auth/ParticlesBackgroundClient';
import TopicPicker, { TOPICS, type ContactTopic } from '@/components/contact/TopicPicker';
import AttachmentPicker, { type Attachment } from '@/components/contact/AttachmentPicker';
import ContactSidebar, { type SocialLinks } from '@/components/contact/ContactSidebar';
import ContactFAQ from '@/components/contact/ContactFAQ';

type Mode = 'message' | 'bug';
type FormState = 'idle' | 'loading' | 'success' | 'error';

interface ContactForm {
  topic: ContactTopic;
  subject: string;
  message: string;
  attachments: Attachment[];
}

interface BugForm {
  pagePath: string;
  title: string;
  steps: string;
  expected: string;
  actual: string;
  screenshotUrl: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const emptyContact: ContactForm = { topic: 'general', subject: '', message: '', attachments: [] };
const emptyBug: BugForm = {
  pagePath: '',
  title: '',
  steps: '',
  expected: '',
  actual: '',
  screenshotUrl: '',
  severity: 'MEDIUM',
};

export default function ContactPage() {
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<Mode>('message');

  const [social, setSocial] = useState<SocialLinks>({
    instagramUrl: '#',
    xUrl: '#',
    discordUrl: '#',
    facebookUrl: '#',
    youtubeUrl: '#',
  });

  useEffect(() => {
    fetch('/api/site-config')
      .then((res) => res.json())
      .then((data) => setSocial(data))
      .catch(() => {});
  }, []);

  const [contact, setContact] = useState<ContactForm>(emptyContact);
  const [contactState, setContactState] = useState<FormState>('idle');
  const [contactErrors, setContactErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [contactServerError, setContactServerError] = useState('');

  const [bug, setBug] = useState<BugForm>(emptyBug);
  const [bugState, setBugState] = useState<FormState>('idle');
  const [bugErrors, setBugErrors] = useState<Partial<Record<keyof BugForm, string>>>({});
  const [bugServerError, setBugServerError] = useState('');

  const activeTopicMeta = useMemo(() => TOPICS.find((t) => t.id === contact.topic), [contact.topic]);

  function validateContact(): boolean {
    const errs: Partial<Record<keyof ContactForm, string>> = {};
    if (contact.subject.trim().length < 3) errs.subject = 'Give it a short subject (3+ chars).';
    if (contact.subject.trim().length > 200) errs.subject = 'Subject is too long.';
    if (contact.message.trim().length < 10) errs.message = 'A little more detail helps (10+ chars).';
    if (contact.message.trim().length > 5000) errs.message = 'Message is too long (max 5000).';
    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateBug(): boolean {
    const errs: Partial<Record<keyof BugForm, string>> = {};
    if (bug.pagePath.trim().length < 1) errs.pagePath = 'Which page had the issue?';
    if (bug.title.trim().length < 3) errs.title = 'A short title helps us triage.';
    if (bug.steps.trim().length < 5) errs.steps = 'Describe how to reproduce.';
    if (bug.expected.trim().length < 3) errs.expected = 'What did you expect?';
    if (bug.actual.trim().length < 3) errs.actual = 'What happened instead?';
    setBugErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submitContact() {
    if (!validateContact()) return;
    setContactState('loading');
    setContactServerError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: contact.topic,
          subject: contact.subject.trim(),
          message: contact.message.trim(),
          attachments: contact.attachments.map((a) => a.s3Url),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to send');
      setContactState('success');
    } catch (e) {
      setContactState('error');
      setContactServerError(e instanceof Error ? e.message : 'Failed to send');
    }
  }

  async function submitBug() {
    if (!validateBug()) return;
    setBugState('loading');
    setBugServerError('');
    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bug,
          pagePath: bug.pagePath.trim(),
          title: bug.title.trim(),
          steps: bug.steps.trim(),
          expected: bug.expected.trim(),
          actual: bug.actual.trim(),
          screenshotUrl: bug.screenshotUrl.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to report');
      setBugState('success');
    } catch (e) {
      setBugState('error');
      setBugServerError(e instanceof Error ? e.message : 'Failed to report');
    }
  }

  function resetContact() {
    setContact(emptyContact);
    setContactErrors({});
    setContactServerError('');
    setContactState('idle');
  }

  function resetBug() {
    setBug(emptyBug);
    setBugErrors({});
    setBugServerError('');
    setBugState('idle');
  }

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[rgba(236,245,255,0.9)]">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="relative min-h-screen">
        <ParticlesBackgroundClient density={20} zIndex={0} />
        <main className="relative z-[2] max-w-3xl mx-auto px-4 py-20">
          <div className="rounded-3xl border border-white/[0.08] bg-[color:var(--card-bg)]/60 backdrop-blur-xl p-8 text-center">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold text-[rgba(220,235,255,0.6)]">
              <MessageSquare className="w-3.5 h-3.5" /> Contact
            </div>
            <h1 className="mt-4 text-3xl font-bold text-[rgba(236,245,255,0.98)] tracking-tight">Get in touch</h1>
            <p className="mt-3 text-[rgba(220,235,255,0.78)]">
              Please{' '}
              <Link className="text-[color:hsl(var(--primary))] underline underline-offset-4" href="/signin">
                sign in
              </Link>{' '}
              to send us a message. We reply faster when you’re signed in.
            </p>
            <div className="mt-6 text-sm text-[rgba(220,235,255,0.65)]">
              Or email us:{' '}
              <a
                className="text-[color:hsl(var(--primary))] hover:underline"
                href="mailto:Chris.G@geekstalk.org"
              >
                Chris.G@geekstalk.org
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <ParticlesBackgroundClient density={25} zIndex={0} />
      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden>
        <div className="absolute inset-0 opacity-[0.35] bg-[radial-gradient(60%_40%_at_50%_0%,rgba(0,220,255,0.18),transparent_60%)]" />
      </div>

      <main className="relative z-[2] px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <header className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] font-semibold text-[color:hsl(var(--primary))] bg-[color:hsl(var(--primary)/0.1)] border border-[color:hsl(var(--primary)/0.25)]">
              <MessageSquare className="w-3 h-3" /> Contact
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold text-[rgba(236,245,255,0.98)] leading-[1.05] tracking-tight">
              Let’s talk.{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[color:hsl(var(--primary))] to-cyan-300">
                We read every message.
              </span>
            </h1>
            <p className="mt-5 text-lg text-[rgba(220,235,255,0.78)] leading-relaxed">
              Questions, partnerships, bug reports, or just saying hi — pick a topic below and tell us what’s on
              your mind. A real human will read it and write back.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-[rgba(220,235,255,0.7)]">
              <div className="inline-flex items-center gap-2">
                <Timer className="w-4 h-4 text-[color:hsl(var(--primary))]" />
                <span>Avg reply ≤ 24h</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <div className="inline-flex items-center gap-2">
                <Users className="w-4 h-4 text-[color:hsl(var(--primary))]" />
                <span>Humans, not bots</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <div className="inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[color:hsl(var(--primary))]" />
                <span>Private &amp; secure</span>
              </div>
            </div>
          </header>

          {/* Mode switcher */}
          <div className="mt-14 flex justify-center">
            <div
              role="tablist"
              aria-label="Contact mode"
              className="inline-flex items-center gap-1 p-1 rounded-full border border-white/[0.08] bg-[color:var(--card-bg)]/50 backdrop-blur-xl"
            >
              <button
                role="tab"
                aria-selected={mode === 'message'}
                onClick={() => setMode('message')}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition ${
                  mode === 'message'
                    ? 'bg-[color:hsl(var(--primary)/0.18)] text-[color:hsl(var(--primary))]'
                    : 'text-[rgba(220,235,255,0.7)] hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" /> Send a message
              </button>
              <button
                role="tab"
                aria-selected={mode === 'bug'}
                onClick={() => setMode('bug')}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition ${
                  mode === 'bug'
                    ? 'bg-[color:hsl(var(--primary)/0.18)] text-[color:hsl(var(--primary))]'
                    : 'text-[rgba(220,235,255,0.7)] hover:text-white'
                }`}
              >
                <Bug className="w-4 h-4" /> Report a bug
              </button>
            </div>
          </div>

          {/* Main grid */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <div className="space-y-6">
              {mode === 'message' ? (
                <>
                  <div>
                    <h2 className="text-sm font-semibold text-[rgba(236,245,255,0.92)] mb-3 uppercase tracking-[0.14em]">
                      What’s this about?
                    </h2>
                    <TopicPicker
                      value={contact.topic}
                      onChange={(topic) => setContact((s) => ({ ...s, topic }))}
                    />
                  </div>

                  <div className="rounded-3xl border border-white/[0.06] bg-[color:var(--card-bg)]/60 backdrop-blur-xl p-6 sm:p-8">
                    {contactState === 'success' ? (
                      <SuccessPanel
                        title="Message sent!"
                        description={
                          activeTopicMeta
                            ? `We got your ${activeTopicMeta.title.toLowerCase()} message. ${activeTopicMeta.sla}.`
                            : 'We got it. Expect a reply soon.'
                        }
                        onReset={resetContact}
                        resetLabel="Send another"
                      />
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitContact();
                        }}
                        className="space-y-5"
                        noValidate
                      >
                        <Field
                          id="subject"
                          label="Subject"
                          hint="Keep it short — one line, like an email subject."
                          error={contactErrors.subject}
                        >
                          <input
                            id="subject"
                            value={contact.subject}
                            onChange={(e) => setContact((s) => ({ ...s, subject: e.target.value }))}
                            onBlur={() => validateContact()}
                            placeholder={`e.g. ${activeTopicMeta?.title} — ${
                              contact.topic === 'support'
                                ? 'Can’t access my account'
                                : contact.topic === 'partnership'
                                  ? 'Integration proposal'
                                  : 'Hello from…'
                            }`}
                            className={inputClass(Boolean(contactErrors.subject))}
                            maxLength={200}
                            required
                          />
                        </Field>

                        <Field
                          id="message"
                          label="Message"
                          hint="Context, what you tried, and what you need — as much as is useful."
                          error={contactErrors.message}
                          trailing={
                            <span className="text-[11px] text-[rgba(220,235,255,0.5)]">
                              {contact.message.length}/5000
                            </span>
                          }
                        >
                          <textarea
                            id="message"
                            value={contact.message}
                            onChange={(e) => setContact((s) => ({ ...s, message: e.target.value }))}
                            onBlur={() => validateContact()}
                            rows={8}
                            placeholder="Tell us what’s going on…"
                            className={`${inputClass(Boolean(contactErrors.message))} resize-y min-h-[160px]`}
                            maxLength={5000}
                            required
                          />
                        </Field>

                        <AttachmentPicker
                          attachments={contact.attachments}
                          onChange={(next) => setContact((s) => ({ ...s, attachments: next }))}
                        />

                        {contactState === 'error' && contactServerError && (
                          <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{contactServerError}</span>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                          <p className="text-xs text-[rgba(220,235,255,0.55)]">
                            Sending as{' '}
                            <span className="text-[rgba(236,245,255,0.9)] font-medium">{session.user.email}</span>
                          </p>
                          <button
                            type="submit"
                            disabled={contactState === 'loading'}
                            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold bg-[color:hsl(var(--primary))] text-[color:hsl(var(--primary-foreground))] hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)]"
                          >
                            {contactState === 'loading' ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" /> Send message
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-white/[0.06] bg-[color:var(--card-bg)]/60 backdrop-blur-xl p-6 sm:p-8">
                  {bugState === 'success' ? (
                    <SuccessPanel
                      title="Bug reported. Thank you!"
                      description="We’ve logged it and someone will look into it. If it’s high-priority, expect a follow-up within a day."
                      onReset={resetBug}
                      resetLabel="Report another"
                    />
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitBug();
                      }}
                      className="space-y-5"
                      noValidate
                    >
                      <div className="flex items-start gap-3 rounded-xl border border-[color:hsl(var(--primary)/0.2)] bg-[color:hsl(var(--primary)/0.06)] px-4 py-3">
                        <Bug className="w-4 h-4 text-[color:hsl(var(--primary))] mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-[rgba(220,235,255,0.85)]">
                          The more context, the faster we fix it. Screenshots help a lot.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field id="pagePath" label="Affected page" error={bugErrors.pagePath}>
                          <input
                            id="pagePath"
                            value={bug.pagePath}
                            onChange={(e) => setBug((s) => ({ ...s, pagePath: e.target.value }))}
                            onBlur={() => validateBug()}
                            placeholder="/live or full URL"
                            className={inputClass(Boolean(bugErrors.pagePath))}
                            required
                          />
                        </Field>

                        <Field id="severity" label="Severity">
                          <div className="relative">
                            <select
                              id="severity"
                              value={bug.severity}
                              onChange={(e) =>
                                setBug((s) => ({ ...s, severity: e.target.value as BugForm['severity'] }))
                              }
                              className={`${inputClass(false)} appearance-none pr-10`}
                            >
                              <option value="LOW">Low — cosmetic</option>
                              <option value="MEDIUM">Medium — annoying</option>
                              <option value="HIGH">High — blocks flow</option>
                              <option value="CRITICAL">Critical — can’t use product</option>
                            </select>
                            <svg
                              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(220,235,255,0.55)]"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        </Field>
                      </div>

                      <Field id="title" label="Title" error={bugErrors.title}>
                        <input
                          id="title"
                          value={bug.title}
                          onChange={(e) => setBug((s) => ({ ...s, title: e.target.value }))}
                          onBlur={() => validateBug()}
                          placeholder="Short summary of what’s broken"
                          className={inputClass(Boolean(bugErrors.title))}
                          maxLength={200}
                          required
                        />
                      </Field>

                      <Field
                        id="steps"
                        label="Steps to reproduce"
                        hint="Number them if you can."
                        error={bugErrors.steps}
                      >
                        <textarea
                          id="steps"
                          value={bug.steps}
                          onChange={(e) => setBug((s) => ({ ...s, steps: e.target.value }))}
                          onBlur={() => validateBug()}
                          rows={4}
                          placeholder="1) Go to /live\n2) Click the ‘Join’ button\n3) …"
                          className={`${inputClass(Boolean(bugErrors.steps))} resize-y min-h-[110px]`}
                          required
                        />
                      </Field>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field id="expected" label="Expected" error={bugErrors.expected}>
                          <textarea
                            id="expected"
                            value={bug.expected}
                            onChange={(e) => setBug((s) => ({ ...s, expected: e.target.value }))}
                            onBlur={() => validateBug()}
                            rows={3}
                            placeholder="What should have happened?"
                            className={`${inputClass(Boolean(bugErrors.expected))} resize-y min-h-[90px]`}
                            required
                          />
                        </Field>

                        <Field id="actual" label="Actual" error={bugErrors.actual}>
                          <textarea
                            id="actual"
                            value={bug.actual}
                            onChange={(e) => setBug((s) => ({ ...s, actual: e.target.value }))}
                            onBlur={() => validateBug()}
                            rows={3}
                            placeholder="What actually happened?"
                            className={`${inputClass(Boolean(bugErrors.actual))} resize-y min-h-[90px]`}
                            required
                          />
                        </Field>
                      </div>

                      <Field id="screenshotUrl" label="Screenshot URL" hint="Optional — paste a link if you have one.">
                        <input
                          id="screenshotUrl"
                          value={bug.screenshotUrl}
                          onChange={(e) => setBug((s) => ({ ...s, screenshotUrl: e.target.value }))}
                          placeholder="https://…"
                          className={inputClass(false)}
                        />
                      </Field>

                      {bugState === 'error' && bugServerError && (
                        <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{bugServerError}</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                        <p className="text-xs text-[rgba(220,235,255,0.55)]">
                          Reporting as{' '}
                          <span className="text-[rgba(236,245,255,0.9)] font-medium">{session.user.email}</span>
                        </p>
                        <button
                          type="submit"
                          disabled={bugState === 'loading'}
                          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold bg-[color:hsl(var(--primary))] text-[color:hsl(var(--primary-foreground))] hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)]"
                        >
                          {bugState === 'loading' ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" /> Submit report
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            <ContactSidebar social={social} />
          </div>

          {/* FAQ */}
          <section className="mt-20 max-w-3xl mx-auto">
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="text-2xl font-bold text-[rgba(236,245,255,0.98)] tracking-tight">
                Common questions
              </h2>
              <Link
                href="/blog"
                className="text-sm text-[rgba(220,235,255,0.7)] hover:text-[color:hsl(var(--primary))] transition inline-flex items-center gap-1"
              >
                More in blog <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <ContactFAQ />
          </section>
        </div>
      </main>
    </div>
  );
}

/* ---------- Small shared helpers ---------- */

function inputClass(hasError: boolean): string {
  return [
    'w-full rounded-xl bg-white/[0.04] text-[rgba(236,245,255,0.95)] px-3.5 py-2.5 text-sm',
    'border transition outline-none',
    'placeholder:text-[rgba(220,235,255,0.4)]',
    hasError
      ? 'border-red-400/40 focus:border-red-400/70 focus:ring-2 focus:ring-red-400/25'
      : 'border-white/[0.1] focus:border-[color:hsl(var(--primary)/0.5)] focus:ring-2 focus:ring-[color:hsl(var(--primary)/0.25)] hover:border-white/20',
  ].join(' ');
}

function Field({
  id,
  label,
  hint,
  error,
  trailing,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-sm font-medium text-[rgba(236,245,255,0.92)]">
          {label}
        </label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-300 inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[rgba(220,235,255,0.55)]">{hint}</p>
      ) : null}
    </div>
  );
}

function SuccessPanel({
  title,
  description,
  onReset,
  resetLabel,
}: {
  title: string;
  description: string;
  onReset: () => void;
  resetLabel: string;
}) {
  return (
    <div className="text-center py-6">
      <div className="mx-auto w-14 h-14 rounded-full bg-[color:hsl(var(--primary)/0.15)] grid place-items-center ring-4 ring-[color:hsl(var(--primary)/0.2)]">
        <CheckCircle2 className="w-7 h-7 text-[color:hsl(var(--primary))]" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-[rgba(236,245,255,0.98)]">{title}</h3>
      <p className="mt-2 text-sm text-[rgba(220,235,255,0.75)] max-w-sm mx-auto leading-relaxed">{description}</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[rgba(236,245,255,0.92)] bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition"
        >
          {resetLabel}
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[color:hsl(var(--primary))] hover:underline"
        >
          Back home <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
