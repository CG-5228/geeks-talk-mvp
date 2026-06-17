"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Coffee,
  Eye,
  EyeOff,
  FolderKanban,
  Hash,
  Key,
  Loader2,
  Lock,
  Megaphone,
  Minus,
  Plus,
  Shapes,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  X,
  type LucideProps,
} from 'lucide-react';

type IconComp = ComponentType<LucideProps>;

export interface ChannelSettings {
  name: string;
  description: string;
  category: string;
  templateId: string | null;
  password: string;
  passwordEnabled: boolean;
  inviteOnly: boolean;
  allowMemberInvites: boolean;
  slowModeSeconds: number;
  maxMembers: number;
}

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (settings: ChannelSettings) => Promise<void>;
}

type WizardStepId = 'template' | 'identity' | 'category' | 'access' | 'review';

type Template = {
  id: string;
  label: string;
  description: string;
  icon: IconComp;
  nameSuggestion: string;
  topicTemplate: string;
  category: string;
  accent: string;
};

type CategoryOption = {
  id: string;
  label: string;
  hint: string;
  icon: IconComp;
  accent: string;
};

const TEMPLATES: Template[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'Start fresh — no preset.',
    icon: Shapes,
    nameSuggestion: '',
    topicTemplate: '',
    category: 'Private',
    accent: 'slate',
  },
  {
    id: 'team',
    label: 'Team Chat',
    description: 'Daily coordination with your team.',
    icon: Users,
    nameSuggestion: 'team-chat',
    topicTemplate: 'Daily standup, blockers, and decisions.',
    category: 'Team',
    accent: 'cyan',
  },
  {
    id: 'project',
    label: 'Project',
    description: 'Track milestones and ship updates.',
    icon: FolderKanban,
    nameSuggestion: 'project-alpha',
    topicTemplate: 'Milestones, tasks, and weekly progress.',
    category: 'Project',
    accent: 'violet',
  },
  {
    id: 'learning',
    label: 'Study Group',
    description: 'Discuss material and learn together.',
    icon: BookOpen,
    nameSuggestion: 'study-group',
    topicTemplate: 'Discuss readings, share resources, solve problems together.',
    category: 'Learning',
    accent: 'emerald',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    description: 'Broadcast important updates.',
    icon: Megaphone,
    nameSuggestion: 'announcements',
    topicTemplate: 'Important updates — please keep chatter minimal.',
    category: 'Announcements',
    accent: 'amber',
  },
  {
    id: 'community',
    label: 'Community',
    description: 'Casual chat and social hangout.',
    icon: Coffee,
    nameSuggestion: 'community',
    topicTemplate: 'Say hi, share wins, hang out.',
    category: 'Community',
    accent: 'rose',
  },
];

const CATEGORIES: CategoryOption[] = [
  { id: 'Private', label: 'Private', hint: 'Personal or invite-only space', icon: Lock, accent: 'slate' },
  { id: 'Team', label: 'Team', hint: 'Coordination with your team', icon: Users, accent: 'cyan' },
  { id: 'Project', label: 'Project', hint: 'A specific initiative or launch', icon: FolderKanban, accent: 'violet' },
  { id: 'Learning', label: 'Learning', hint: 'Study group or book club', icon: BookOpen, accent: 'emerald' },
  { id: 'Announcements', label: 'Announcements', hint: 'Broadcast updates only', icon: Megaphone, accent: 'amber' },
  { id: 'Community', label: 'Community', hint: 'Casual social space', icon: Coffee, accent: 'rose' },
];

const STEPS: { id: WizardStepId; label: string; subtitle: string }[] = [
  { id: 'template', label: 'Template', subtitle: 'Start from a preset or a blank slate' },
  { id: 'identity', label: 'Identity', subtitle: 'Pick a name and describe the space' },
  { id: 'category', label: 'Category', subtitle: 'Help members find it later' },
  { id: 'access', label: 'Access', subtitle: 'Password, invites, and rate limits' },
  { id: 'review', label: 'Review', subtitle: 'Confirm and create' },
];

const SLOW_MODE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 300, label: '5m' },
  { value: 900, label: '15m' },
];

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;
const MIN_MEMBERS = 2;
const MAX_MEMBERS = 5000;
const DRAFT_KEY = 'chat:create-channel-draft:v3';
const NAME_MIN = 2;
const NAME_MAX = 50;
const DESC_MAX = 500;
const NAME_RE = /^[a-z0-9_-]+$/;

const ACCENT_CLASSES: Record<string, { ring: string; bg: string; fg: string; border: string }> = {
  slate: {
    ring: 'ring-[rgba(148,163,184,0.45)]',
    bg: 'bg-[rgba(148,163,184,0.14)]',
    fg: 'text-[rgba(226,232,240,0.95)]',
    border: 'border-[rgba(148,163,184,0.35)]',
  },
  cyan: {
    ring: 'ring-[rgba(34,211,238,0.5)]',
    bg: 'bg-[rgba(34,211,238,0.14)]',
    fg: 'text-[rgba(165,243,252,0.95)]',
    border: 'border-[rgba(34,211,238,0.4)]',
  },
  violet: {
    ring: 'ring-[rgba(167,139,250,0.5)]',
    bg: 'bg-[rgba(167,139,250,0.14)]',
    fg: 'text-[rgba(221,214,254,0.95)]',
    border: 'border-[rgba(167,139,250,0.4)]',
  },
  emerald: {
    ring: 'ring-[rgba(52,211,153,0.5)]',
    bg: 'bg-[rgba(52,211,153,0.14)]',
    fg: 'text-[rgba(167,243,208,0.95)]',
    border: 'border-[rgba(52,211,153,0.4)]',
  },
  amber: {
    ring: 'ring-[rgba(251,191,36,0.5)]',
    bg: 'bg-[rgba(251,191,36,0.14)]',
    fg: 'text-[rgba(253,230,138,0.95)]',
    border: 'border-[rgba(251,191,36,0.4)]',
  },
  rose: {
    ring: 'ring-[rgba(251,113,133,0.5)]',
    bg: 'bg-[rgba(251,113,133,0.14)]',
    fg: 'text-[rgba(254,205,211,0.95)]',
    border: 'border-[rgba(251,113,133,0.4)]',
  },
};

function accentOf(key: string) {
  return ACCENT_CLASSES[key] ?? ACCENT_CLASSES.slate;
}

function normalizeName(raw: string) {
  return raw
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .slice(0, NAME_MAX);
}

function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Channel name is required';
  if (trimmed.length < NAME_MIN) return `At least ${NAME_MIN} characters`;
  if (trimmed.length > NAME_MAX) return `At most ${NAME_MAX} characters`;
  if (!NAME_RE.test(trimmed)) return 'Use lowercase letters, numbers, hyphens, or underscores';
  return null;
}

function validatePassword(pwd: string): string | null {
  if (pwd.length === 0) return 'Password is required when protection is on';
  if (pwd.length < MIN_PASSWORD_LENGTH) return `At least ${MIN_PASSWORD_LENGTH} characters`;
  if (pwd.length > MAX_PASSWORD_LENGTH) return `At most ${MAX_PASSWORD_LENGTH} characters`;
  return null;
}

type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string; tone: 'rose' | 'amber' | 'emerald' };

function scorePassword(pwd: string): PasswordStrength {
  if (!pwd) return { score: 0, label: '—', tone: 'rose' };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const label = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][clamped];
  const tone = clamped <= 1 ? 'rose' : clamped <= 2 ? 'amber' : 'emerald';
  return { score: clamped, label, tone };
}

type DraftState = {
  templateId: string | null;
  name: string;
  description: string;
  category: string;
  password: string;
  passwordEnabled: boolean;
  inviteOnly: boolean;
  allowMemberInvites: boolean;
  slowModeSeconds: number;
  maxMembers: number;
};

const EMPTY_DRAFT: DraftState = {
  templateId: null,
  name: '',
  description: '',
  category: 'Private',
  password: '',
  passwordEnabled: false,
  inviteOnly: false,
  allowMemberInvites: true,
  slowModeSeconds: 0,
  maxMembers: 0,
};

function readDraft(): DraftState {
  if (typeof window === 'undefined') return EMPTY_DRAFT;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw);
    return {
      templateId: typeof parsed?.templateId === 'string' ? parsed.templateId : null,
      name: typeof parsed?.name === 'string' ? parsed.name : '',
      description: typeof parsed?.description === 'string' ? parsed.description : '',
      category: typeof parsed?.category === 'string' ? parsed.category : 'Private',
      // Passwords are NOT persisted in drafts for security reasons
      password: '',
      passwordEnabled: Boolean(parsed?.passwordEnabled),
      inviteOnly: Boolean(parsed?.inviteOnly),
      allowMemberInvites:
        typeof parsed?.allowMemberInvites === 'boolean' ? parsed.allowMemberInvites : true,
      slowModeSeconds:
        typeof parsed?.slowModeSeconds === 'number' && Number.isFinite(parsed.slowModeSeconds)
          ? parsed.slowModeSeconds
          : 0,
      maxMembers:
        typeof parsed?.maxMembers === 'number' && Number.isFinite(parsed.maxMembers)
          ? parsed.maxMembers
          : 0,
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

function writeDraft(d: DraftState) {
  if (typeof window === 'undefined') return;
  try {
    const { password: _pwd, ...safe } = d;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(safe));
  } catch {
    /* quota — ignore */
  }
}

function clearDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function formatSlowMode(sec: number) {
  const found = SLOW_MODE_OPTIONS.find((o) => o.value === sec);
  return found?.label ?? 'Off';
}

export default function CreateChannelModal({ open, onClose, onCreate }: CreateChannelModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [stepIdx, setStepIdx] = useState(0);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [touched, setTouched] = useState<{ name: boolean; password: boolean }>({
    name: false,
    password: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(readDraft());
    setTouched({ name: false, password: false });
    setSubmitError(null);
    setConfirmDismiss(false);
    setShowPassword(false);
    setStepIdx(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    writeDraft(draft);
  }, [open, draft]);

  const step = STEPS[stepIdx];
  const nameError = useMemo(() => validateName(draft.name), [draft.name]);
  const passwordError = useMemo(
    () => (draft.passwordEnabled ? validatePassword(draft.password) : null),
    [draft.passwordEnabled, draft.password],
  );
  const maxMembersError = useMemo(() => {
    if (draft.maxMembers === 0) return null;
    if (draft.maxMembers < MIN_MEMBERS) return `Must be at least ${MIN_MEMBERS}`;
    if (draft.maxMembers > MAX_MEMBERS) return `Must be at most ${MAX_MEMBERS}`;
    return null;
  }, [draft.maxMembers]);

  const isDirty = useMemo(
    () =>
      draft.name.trim().length > 0 ||
      draft.description.trim().length > 0 ||
      draft.templateId !== null ||
      draft.passwordEnabled ||
      draft.inviteOnly ||
      draft.slowModeSeconds > 0 ||
      draft.maxMembers > 0,
    [draft],
  );

  const canAdvance = useMemo(() => {
    switch (step.id) {
      case 'template':
        return true;
      case 'identity':
        return !nameError;
      case 'category':
        return CATEGORIES.some((c) => c.id === draft.category);
      case 'access':
        return !passwordError && !maxMembersError;
      case 'review':
        return !nameError && !passwordError && !maxMembersError;
      default:
        return false;
    }
  }, [step.id, nameError, passwordError, maxMembersError, draft.category]);

  const applyTemplate = useCallback((tpl: Template) => {
    setDraft((prev) => ({
      ...prev,
      templateId: tpl.id,
      name: tpl.nameSuggestion ? normalizeName(tpl.nameSuggestion) : prev.name,
      description: tpl.topicTemplate || prev.description,
      category: tpl.category,
    }));
  }, []);

  const handleNext = useCallback(() => {
    if (step.id === 'identity') {
      setTouched((t) => ({ ...t, name: true }));
    }
    if (step.id === 'access' && draft.passwordEnabled) {
      setTouched((t) => ({ ...t, password: true }));
    }
    if (!canAdvance) return;
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  }, [step.id, canAdvance, draft.passwordEnabled]);

  const handleBack = useCallback(() => {
    setStepIdx((i) => Math.max(i - 1, 0));
  }, []);

  const requestClose = useCallback(() => {
    if (submitting) return;
    if (isDirty) {
      setConfirmDismiss(true);
      return;
    }
    onClose();
  }, [submitting, isDirty, onClose]);

  const discardAndClose = useCallback(() => {
    clearDraft();
    setDraft(EMPTY_DRAFT);
    setTouched({ name: false, password: false });
    setSubmitError(null);
    setConfirmDismiss(false);
    setShowPassword(false);
    setStepIdx(0);
    onClose();
  }, [onClose]);

  const handleCreate = useCallback(async () => {
    if (nameError) {
      setTouched((t) => ({ ...t, name: true }));
      setStepIdx(1);
      return;
    }
    if (passwordError) {
      setTouched((t) => ({ ...t, password: true }));
      setStepIdx(3);
      return;
    }
    if (maxMembersError) {
      setStepIdx(3);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onCreate({
        name: draft.name.trim(),
        description: draft.description.trim(),
        category: draft.category,
        templateId: draft.templateId,
        password: draft.passwordEnabled ? draft.password : '',
        passwordEnabled: draft.passwordEnabled,
        inviteOnly: draft.inviteOnly,
        allowMemberInvites: draft.inviteOnly ? false : draft.allowMemberInvites,
        slowModeSeconds: draft.slowModeSeconds,
        maxMembers: draft.maxMembers,
      });
      clearDraft();
      setDraft(EMPTY_DRAFT);
      setTouched({ name: false, password: false });
      setShowPassword(false);
      setStepIdx(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [draft, nameError, passwordError, maxMembersError, onCreate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirmDismiss) setConfirmDismiss(false);
        else requestClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, requestClose, confirmDismiss]);

  useLayoutEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      const host = dialogRef.current;
      if (!host) return;
      const focusable = host.querySelector<HTMLElement>(
        '[data-step-autofocus="true"], input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 30);
    return () => window.clearTimeout(id);
  }, [open, stepIdx]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onDialogKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      const host = dialogRef.current;
      if (!host) return;
      const focusables = Array.from(
        host.querySelectorAll<HTMLElement>(
          'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('aria-hidden'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!open || !mounted) return null;

  const activeTemplate = TEMPLATES.find((t) => t.id === draft.templateId) ?? null;
  const activeCategory = CATEGORIES.find((c) => c.id === draft.category) ?? CATEGORIES[0];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-channel-title"
      aria-describedby="create-channel-sub"
      className="fixed inset-0 z-[1000] flex items-start justify-center pt-[6vh] px-4 pb-6"
      onKeyDown={onDialogKey}
    >
      <button
        type="button"
        aria-label="Close create channel"
        onClick={requestClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm cursor-default"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-3xl rounded-2xl border border-white/[0.08] bg-[color:var(--nav-bg)]/95 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] overflow-hidden flex flex-col max-h-[88vh]"
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[rgba(220,235,255,0.55)]">
              <Sparkles className="h-3 w-3 text-[color:hsl(var(--primary))]" />
              New channel
            </div>
            <h2
              id="create-channel-title"
              className="mt-1.5 text-xl font-semibold text-[rgba(236,245,255,0.98)]"
            >
              {step.label}
            </h2>
            <p id="create-channel-sub" className="mt-0.5 text-sm text-[rgba(220,235,255,0.7)]">
              {step.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={submitting}
            className="p-2 rounded-lg hover:bg-white/[0.06] text-[rgba(220,235,255,0.7)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <StepRail stepIdx={stepIdx} onJump={(i) => i < stepIdx && setStepIdx(i)} />

        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {`Step ${stepIdx + 1} of ${STEPS.length}: ${step.label}`}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step.id === 'template' && (
            <TemplateStep selectedId={draft.templateId} onSelect={applyTemplate} />
          )}
          {step.id === 'identity' && (
            <IdentityStep
              name={draft.name}
              description={draft.description}
              nameError={nameError}
              nameTouched={touched.name}
              onNameChange={(v) => setDraft((d) => ({ ...d, name: normalizeName(v) }))}
              onNameBlur={() => setTouched((t) => ({ ...t, name: true }))}
              onDescriptionChange={(v) =>
                setDraft((d) => ({ ...d, description: v.slice(0, DESC_MAX) }))
              }
            />
          )}
          {step.id === 'category' && (
            <CategoryStep
              selected={draft.category}
              onSelect={(id) => setDraft((d) => ({ ...d, category: id }))}
            />
          )}
          {step.id === 'access' && (
            <AccessStep
              draft={draft}
              setDraft={setDraft}
              passwordError={passwordError}
              passwordTouched={touched.password}
              onPasswordBlur={() => setTouched((t) => ({ ...t, password: true }))}
              maxMembersError={maxMembersError}
              showPassword={showPassword}
              onTogglePasswordVisibility={() => setShowPassword((v) => !v)}
            />
          )}
          {step.id === 'review' && (
            <ReviewStep
              draft={draft}
              template={activeTemplate}
              category={activeCategory}
              submitError={submitError}
            />
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/[0.06] bg-[color:var(--nav-bg)]/60">
          <div className="text-[11px] text-[rgba(220,235,255,0.55)] hidden sm:flex items-center gap-1.5">
            {isDirty && !submitting && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[rgba(52,211,153,0.8)]" />
                Draft auto-saved
              </>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={stepIdx === 0 ? requestClose : handleBack}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg text-sm font-medium text-[rgba(220,235,255,0.8)] hover:text-white hover:bg-white/[0.05] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.6)]"
            >
              {stepIdx === 0 ? (
                'Cancel'
              ) : (
                <>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </>
              )}
            </button>
            {step.id !== 'review' ? (
              <button
                type="button"
                onClick={handleNext}
                aria-disabled={!canAdvance}
                className={`inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-lg text-sm font-medium bg-[color:hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_0_18px_hsl(var(--primary)/0.3)] hover:brightness-110 transition-[filter,opacity] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.6)] ${
                  canAdvance ? '' : 'opacity-60'
                }`}
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting || !canAdvance}
                className="inline-flex items-center gap-2 min-h-[40px] px-4 rounded-lg text-sm font-medium bg-[color:hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_0_18px_hsl(var(--primary)/0.3)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-[filter,opacity] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.6)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Create channel
                  </>
                )}
              </button>
            )}
          </div>
        </footer>

        {confirmDismiss && (
          <DirtyConfirm
            onKeepEditing={() => setConfirmDismiss(false)}
            onDiscard={discardAndClose}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

function StepRail({ stepIdx, onJump }: { stepIdx: number; onJump: (i: number) => void }) {
  return (
    <nav aria-label="Channel setup progress" className="px-6 pt-3 pb-3 border-b border-white/[0.06]">
      <ol className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const isActive = i === stepIdx;
          const isDone = i < stepIdx;
          const isReachable = i <= stepIdx;
          return (
            <li key={s.id} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                onClick={() => isReachable && onJump(i)}
                aria-current={isActive ? 'step' : undefined}
                disabled={!isReachable}
                className={`group flex items-center gap-2 min-h-[32px] px-1.5 rounded-md text-left transition-colors min-w-0 ${
                  isReachable
                    ? 'hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.5)]'
                    : 'cursor-default opacity-70'
                }`}
              >
                <span
                  className={`grid place-items-center h-5 w-5 rounded-full text-[10px] font-semibold shrink-0 transition-all ${
                    isActive
                      ? 'bg-[color:hsl(var(--primary))] text-[hsl(var(--primary-foreground))] scale-105'
                      : isDone
                      ? 'bg-[color:hsl(var(--primary)/0.2)] text-[color:hsl(var(--primary))] ring-1 ring-[color:hsl(var(--primary)/0.5)]'
                      : 'bg-white/[0.06] text-[rgba(220,235,255,0.55)] ring-1 ring-white/[0.08]'
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={`truncate text-xs font-medium hidden sm:block ${
                    isActive
                      ? 'text-[rgba(236,245,255,0.98)]'
                      : 'text-[rgba(220,235,255,0.7)]'
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`flex-1 h-px mx-1 transition-colors ${
                    isDone ? 'bg-[color:hsl(var(--primary)/0.4)]' : 'bg-white/[0.06]'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function useArrowRadio<T extends { id: string }>(items: T[], selectedId: string | null, onSelect: (t: T) => void) {
  return useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const arrows = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
      if (!arrows.includes(e.key)) return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const idx = Math.max(0, items.findIndex((i) => i.id === selectedId));
      const nextIdx = (idx + dir + items.length) % items.length;
      onSelect(items[nextIdx]);
    },
    [items, selectedId, onSelect],
  );
}

function TemplateStep({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (tpl: Template) => void;
}) {
  const onKeyDown = useArrowRadio(TEMPLATES, selectedId, onSelect);
  return (
    <div
      role="radiogroup"
      aria-label="Channel template"
      className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
      onKeyDown={onKeyDown}
    >
      {TEMPLATES.map((tpl, i) => {
        const Icon = tpl.icon;
        const a = accentOf(tpl.accent);
        const selected = selectedId === tpl.id;
        return (
          <button
            key={tpl.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!selectedId && i === 0) ? 0 : -1}
            data-step-autofocus={i === 0 && !selectedId ? 'true' : undefined}
            onClick={() => onSelect(tpl)}
            className={`group flex items-start gap-3 p-4 rounded-xl border text-left transition-all min-h-[84px] ${
              selected
                ? `${a.border} ring-2 ${a.ring} bg-white/[0.04]`
                : 'border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.03]'
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.6)]`}
          >
            <span className={`shrink-0 grid place-items-center h-10 w-10 rounded-lg ${a.bg} ${a.fg}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[rgba(236,245,255,0.95)] truncate">
                  {tpl.label}
                </span>
                {selected && (
                  <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold ${a.fg}`}>
                    <Check className="h-3 w-3" /> Selected
                  </span>
                )}
              </span>
              <span className="mt-1 block text-xs text-[rgba(220,235,255,0.7)] leading-relaxed">
                {tpl.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function IdentityStep({
  name,
  description,
  nameError,
  nameTouched,
  onNameChange,
  onNameBlur,
  onDescriptionChange,
}: {
  name: string;
  description: string;
  nameError: string | null;
  nameTouched: boolean;
  onNameChange: (v: string) => void;
  onNameBlur: () => void;
  onDescriptionChange: (v: string) => void;
}) {
  const showError = nameTouched && nameError;
  const previewName = name.trim() || 'channel-name';
  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="channel-name"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[rgba(220,235,255,0.7)]"
        >
          Channel name
          <span aria-hidden="true" className="text-[rgba(251,113,133,0.9)]">*</span>
        </label>
        <div
          className={`mt-1.5 flex items-center rounded-lg border bg-white/[0.04] focus-within:bg-white/[0.06] transition-colors ${
            showError ? 'border-[rgba(251,113,133,0.5)]' : 'border-white/[0.1] focus-within:border-[color:hsl(var(--primary)/0.45)]'
          }`}
        >
          <span className="pl-3 text-[rgba(220,235,255,0.55)]">
            <Hash className="h-4 w-4" />
          </span>
          <input
            id="channel-name"
            data-step-autofocus="true"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameBlur}
            placeholder="general"
            maxLength={NAME_MAX}
            aria-invalid={!!showError}
            aria-describedby="channel-name-help"
            className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-sm text-[rgba(236,245,255,0.98)] placeholder:text-[rgba(220,235,255,0.4)] focus:outline-none"
          />
          <span className="pr-3 text-[11px] font-mono tabular-nums text-[rgba(220,235,255,0.5)]">
            {name.length}/{NAME_MAX}
          </span>
        </div>
        <p
          id="channel-name-help"
          className={`mt-1.5 text-xs ${
            showError ? 'text-[rgba(251,113,133,0.95)]' : 'text-[rgba(220,235,255,0.55)]'
          }`}
          role={showError ? 'alert' : undefined}
        >
          {showError
            ? nameError
            : 'Lowercase letters, numbers, hyphens, or underscores. Auto-formatted as you type.'}
        </p>
      </div>

      <div>
        <label
          htmlFor="channel-description"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[rgba(220,235,255,0.7)]"
        >
          Description
          <span className="text-[rgba(220,235,255,0.4)] font-normal normal-case tracking-normal">
            (optional)
          </span>
        </label>
        <textarea
          id="channel-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What's this channel about? Add context for the people who join."
          rows={3}
          maxLength={DESC_MAX}
          className="mt-1.5 w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-[rgba(236,245,255,0.98)] placeholder:text-[rgba(220,235,255,0.4)] focus:outline-none focus:border-[color:hsl(var(--primary)/0.45)] focus:bg-white/[0.06] transition-colors resize-none"
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-[rgba(220,235,255,0.55)]">
          <span>Shown at the top of the channel.</span>
          <span className="font-mono tabular-nums">
            {description.length}/{DESC_MAX}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(220,235,255,0.55)]">
          Preview
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-sm text-[rgba(236,245,255,0.95)]">
          <Hash className="h-4 w-4 text-[rgba(220,235,255,0.6)]" />
          <span className="font-semibold">{previewName}</span>
        </div>
        {description.trim() && (
          <p className="mt-1 text-xs text-[rgba(220,235,255,0.7)] line-clamp-2">
            {description.trim()}
          </p>
        )}
      </div>
    </div>
  );
}

function CategoryStep({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  const items = CATEGORIES;
  const onKeyDown = useArrowRadio(items, selected, (t) => onSelect(t.id));
  return (
    <div>
      <p className="text-sm text-[rgba(220,235,255,0.7)] mb-3">
        Categories help you group channels in the sidebar.
      </p>
      <div
        role="radiogroup"
        aria-label="Channel category"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        onKeyDown={onKeyDown}
      >
        {items.map((c, i) => {
          const Icon = c.icon;
          const a = accentOf(c.accent);
          const isSelected = selected === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected || (!selected && i === 0) ? 0 : -1}
              data-step-autofocus={isSelected && i === 0 ? 'true' : undefined}
              onClick={() => onSelect(c.id)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all min-h-[60px] ${
                isSelected
                  ? `${a.border} ring-2 ${a.ring} bg-white/[0.04]`
                  : 'border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.03]'
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.6)]`}
            >
              <span className={`shrink-0 grid place-items-center h-9 w-9 rounded-lg ${a.bg} ${a.fg}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[rgba(236,245,255,0.95)]">
                  {c.label}
                </span>
                <span className="block text-xs text-[rgba(220,235,255,0.65)] truncate">
                  {c.hint}
                </span>
              </span>
              {isSelected && <Check className={`h-4 w-4 shrink-0 ${a.fg}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AccessStep({
  draft,
  setDraft,
  passwordError,
  passwordTouched,
  onPasswordBlur,
  maxMembersError,
  showPassword,
  onTogglePasswordVisibility,
}: {
  draft: DraftState;
  setDraft: React.Dispatch<React.SetStateAction<DraftState>>;
  passwordError: string | null;
  passwordTouched: boolean;
  onPasswordBlur: () => void;
  maxMembersError: string | null;
  showPassword: boolean;
  onTogglePasswordVisibility: () => void;
}) {
  const strength = useMemo(() => scorePassword(draft.password), [draft.password]);
  const showPwdError = passwordTouched && passwordError;
  return (
    <div className="space-y-5">
      <AccessBlock
        icon={Key}
        accent="amber"
        title="Password protection"
        subtitle="Anyone joining via invite link must enter this password."
      >
        <label className="flex items-center justify-between gap-3 text-sm text-[rgba(236,245,255,0.95)]">
          <span>Require password to join</span>
          <Toggle
            checked={draft.passwordEnabled}
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                passwordEnabled: v,
                password: v ? d.password : '',
              }))
            }
            ariaLabel="Require password"
          />
        </label>

        {draft.passwordEnabled && (
          <div className="mt-4 space-y-2.5">
            <div
              className={`flex items-center rounded-lg border bg-white/[0.04] focus-within:bg-white/[0.06] transition-colors ${
                showPwdError
                  ? 'border-[rgba(251,113,133,0.5)]'
                  : 'border-white/[0.1] focus-within:border-[color:hsl(var(--primary)/0.45)]'
              }`}
            >
              <span className="pl-3 text-[rgba(220,235,255,0.55)]">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="channel-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={draft.password}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, password: e.target.value.slice(0, MAX_PASSWORD_LENGTH) }))
                }
                onBlur={onPasswordBlur}
                placeholder={`${MIN_PASSWORD_LENGTH}+ characters`}
                maxLength={MAX_PASSWORD_LENGTH}
                aria-invalid={!!showPwdError}
                aria-describedby="channel-password-help"
                className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-sm text-[rgba(236,245,255,0.98)] placeholder:text-[rgba(220,235,255,0.4)] focus:outline-none"
              />
              <button
                type="button"
                onClick={onTogglePasswordVisibility}
                className="px-3 text-[rgba(220,235,255,0.55)] hover:text-[rgba(236,245,255,0.95)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.5)] rounded"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <StrengthBar strength={strength} visible={draft.password.length > 0} />

            <p
              id="channel-password-help"
              className={`text-xs ${
                showPwdError ? 'text-[rgba(251,113,133,0.95)]' : 'text-[rgba(220,235,255,0.55)]'
              }`}
              role={showPwdError ? 'alert' : undefined}
            >
              {showPwdError
                ? passwordError
                : 'Stored with bcrypt. Share the password out-of-band with trusted people only.'}
            </p>
          </div>
        )}
      </AccessBlock>

      <AccessBlock
        icon={UserPlus}
        accent="cyan"
        title="Who can invite members"
        subtitle="Control who can bring new people into the channel."
      >
        <div role="radiogroup" aria-label="Invite policy" className="space-y-2">
          <InvitePolicyOption
            id="owner-only"
            label="Only me"
            hint="Just the owner can invite new members."
            icon={Shield}
            selected={draft.inviteOnly}
            onSelect={() =>
              setDraft((d) => ({
                ...d,
                inviteOnly: true,
                allowMemberInvites: false,
              }))
            }
          />
          <InvitePolicyOption
            id="owner-plus-members"
            label="Me and channel members"
            hint="Members can also share invites. Recommended for growing spaces."
            icon={Users}
            selected={!draft.inviteOnly}
            onSelect={() =>
              setDraft((d) => ({
                ...d,
                inviteOnly: false,
                allowMemberInvites: true,
              }))
            }
          />
        </div>
      </AccessBlock>

      <AccessBlock
        icon={Clock}
        accent="violet"
        title="Slow mode"
        subtitle="Minimum gap between messages from the same user."
      >
        <div role="radiogroup" aria-label="Slow mode interval" className="flex flex-wrap gap-1.5">
          {SLOW_MODE_OPTIONS.map((opt) => {
            const active = draft.slowModeSeconds === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDraft((d) => ({ ...d, slowModeSeconds: opt.value }))}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.5)] ${
                  active
                    ? 'bg-[color:hsl(var(--primary)/0.2)] text-[color:hsl(var(--primary))] ring-1 ring-[color:hsl(var(--primary)/0.45)]'
                    : 'bg-white/[0.04] text-[rgba(220,235,255,0.8)] hover:bg-white/[0.08] ring-1 ring-white/[0.06]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </AccessBlock>

      <AccessBlock
        icon={Users}
        accent="emerald"
        title="Member limit"
        subtitle="Cap how many members can join."
      >
        <MemberStepper
          value={draft.maxMembers}
          onChange={(v) => setDraft((d) => ({ ...d, maxMembers: v }))}
          error={maxMembersError}
        />
      </AccessBlock>
    </div>
  );
}

function AccessBlock({
  icon: Icon,
  accent: accentKey,
  title,
  subtitle,
  children,
}: {
  icon: IconComp;
  accent: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const a = accentOf(accentKey);
  return (
    <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <header className="flex items-start gap-3 mb-3">
        <span className={`shrink-0 grid place-items-center h-8 w-8 rounded-lg ${a.bg} ${a.fg}`} aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[rgba(236,245,255,0.98)]">{title}</h3>
          <p className="mt-0.5 text-xs text-[rgba(220,235,255,0.65)] leading-relaxed">{subtitle}</p>
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.6)] ${
        checked ? 'bg-[color:hsl(var(--primary))]' : 'bg-white/[0.15]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function StrengthBar({
  strength,
  visible,
}: {
  strength: PasswordStrength;
  visible: boolean;
}) {
  if (!visible) return null;
  const { score, label, tone } = strength;
  const toneColor =
    tone === 'rose'
      ? 'bg-[rgba(251,113,133,0.9)]'
      : tone === 'amber'
      ? 'bg-[rgba(251,191,36,0.9)]'
      : 'bg-[rgba(52,211,153,0.9)]';
  const toneText =
    tone === 'rose'
      ? 'text-[rgba(254,205,211,0.95)]'
      : tone === 'amber'
      ? 'text-[rgba(253,230,138,0.95)]'
      : 'text-[rgba(167,243,208,0.95)]';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < score ? toneColor : 'bg-white/[0.08]'
            }`}
          />
        ))}
      </div>
      <span className={`text-[11px] font-semibold tabular-nums shrink-0 ${toneText}`}>{label}</span>
    </div>
  );
}

function InvitePolicyOption({
  id,
  label,
  hint,
  icon: Icon,
  selected,
  onSelect,
}: {
  id: string;
  label: string;
  hint: string;
  icon: IconComp;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-hint`}
      onClick={onSelect}
      className={`w-full flex items-start gap-3 px-3.5 py-3 rounded-lg border text-left transition-all ${
        selected
          ? 'border-[color:hsl(var(--primary)/0.5)] ring-2 ring-[color:hsl(var(--primary)/0.3)] bg-[color:hsl(var(--primary)/0.06)]'
          : 'border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.03]'
      } focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.6)]`}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 grid place-items-center h-8 w-8 rounded-lg transition-colors ${
          selected
            ? 'bg-[color:hsl(var(--primary)/0.2)] text-[color:hsl(var(--primary))]'
            : 'bg-white/[0.05] text-[rgba(220,235,255,0.75)]'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span id={`${id}-label`} className="block text-sm font-semibold text-[rgba(236,245,255,0.95)]">
          {label}
        </span>
        <span id={`${id}-hint`} className="mt-0.5 block text-xs text-[rgba(220,235,255,0.65)] leading-relaxed">
          {hint}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`mt-1 shrink-0 h-4 w-4 rounded-full border-2 transition-colors ${
          selected
            ? 'border-[color:hsl(var(--primary))] bg-[color:hsl(var(--primary))]'
            : 'border-white/[0.25]'
        }`}
      >
        {selected && (
          <span className="block h-full w-full rounded-full bg-[hsl(var(--primary-foreground))] scale-[0.45]" />
        )}
      </span>
    </button>
  );
}

function MemberStepper({
  value,
  onChange,
  error,
}: {
  value: number;
  onChange: (v: number) => void;
  error: string | null;
}) {
  const clamp = (v: number) => {
    if (v <= 0) return 0;
    if (v < MIN_MEMBERS) return MIN_MEMBERS;
    if (v > MAX_MEMBERS) return MAX_MEMBERS;
    return Math.floor(v);
  };
  const dec = () => onChange(clamp(value === 0 ? 0 : value <= MIN_MEMBERS ? 0 : value - 1));
  const inc = () => onChange(clamp(value === 0 ? MIN_MEMBERS : value + 1));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          aria-label="Decrease member limit"
          className="h-9 w-9 grid place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[rgba(220,235,255,0.85)] hover:bg-white/[0.08] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.6)]"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="flex-1 relative">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_MEMBERS}
            step={1}
            value={value === 0 ? '' : value}
            placeholder="Unlimited"
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) {
                onChange(0);
                return;
              }
              const n = parseInt(raw, 10);
              if (Number.isFinite(n)) onChange(clamp(n));
            }}
            className={`w-full h-9 px-3 text-center font-mono tabular-nums text-sm rounded-lg border bg-white/[0.04] text-[rgba(236,245,255,0.98)] placeholder:text-[rgba(220,235,255,0.5)] focus:outline-none ${
              error
                ? 'border-[rgba(251,113,133,0.5)]'
                : 'border-white/[0.1] focus:border-[color:hsl(var(--primary)/0.45)]'
            }`}
            aria-invalid={!!error}
          />
        </div>
        <button
          type="button"
          onClick={inc}
          aria-label="Increase member limit"
          className="h-9 w-9 grid place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-[rgba(220,235,255,0.85)] hover:bg-white/[0.08] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.6)]"
        >
          <Plus className="h-4 w-4" />
        </button>
        <span className="hidden sm:block text-xs text-[rgba(220,235,255,0.55)] min-w-[80px]">
          {value === 0 ? 'Unlimited' : `${value} max`}
        </span>
      </div>
      <p className={`text-xs ${error ? 'text-[rgba(251,113,133,0.95)]' : 'text-[rgba(220,235,255,0.55)]'}`} role={error ? 'alert' : undefined}>
        {error ?? `Leave empty or 0 for unlimited. Cap is ${MAX_MEMBERS.toLocaleString()}.`}
      </p>
    </div>
  );
}

function ReviewStep({
  draft,
  template,
  category,
  submitError,
}: {
  draft: DraftState;
  template: Template | null;
  category: CategoryOption;
  submitError: string | null;
}) {
  const catAccent = accentOf(category.accent);
  const invitePolicy = draft.inviteOnly ? 'Owner only' : 'Owner + members';
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-start gap-3">
          <span
            className={`shrink-0 grid place-items-center h-11 w-11 rounded-xl ${catAccent.bg} ${catAccent.fg}`}
            aria-hidden="true"
          >
            <Hash className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-[rgba(236,245,255,0.98)] truncate">
                #{draft.name.trim() || 'channel-name'}
              </h3>
              <span className="inline-flex items-center gap-1 shrink-0 rounded-full border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[rgba(220,235,255,0.75)]">
                <Lock className="h-2.5 w-2.5" /> Private
              </span>
              {draft.passwordEnabled && (
                <span className="inline-flex items-center gap-1 shrink-0 rounded-full border border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.08)] px-2 py-0.5 text-[10px] font-medium text-[rgba(253,230,138,0.95)]">
                  <Key className="h-2.5 w-2.5" /> Password
                </span>
              )}
            </div>
            {draft.description.trim() ? (
              <p className="mt-1 text-sm text-[rgba(220,235,255,0.8)] leading-relaxed">
                {draft.description.trim()}
              </p>
            ) : (
              <p className="mt-1 text-sm italic text-[rgba(220,235,255,0.5)]">
                No description — add one later in channel settings.
              </p>
            )}
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <InfoRow label="Category" icon={category.icon} accent={category.accent} value={category.label} />
        <InfoRow
          label="Template"
          icon={template?.icon ?? Shapes}
          accent={template?.accent ?? 'slate'}
          value={template?.label ?? 'Blank'}
        />
        <InfoRow label="Invite policy" icon={UserPlus} accent="cyan" value={invitePolicy} />
        <InfoRow
          label="Slow mode"
          icon={Clock}
          accent="violet"
          value={formatSlowMode(draft.slowModeSeconds)}
        />
        <InfoRow
          label="Member limit"
          icon={Users}
          accent="emerald"
          value={draft.maxMembers === 0 ? 'Unlimited' : `${draft.maxMembers.toLocaleString()}`}
        />
        <InfoRow
          label="Password"
          icon={Key}
          accent="amber"
          value={draft.passwordEnabled ? 'Required' : 'None'}
        />
      </dl>

      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-[rgba(251,113,133,0.35)] bg-[rgba(251,113,133,0.08)] px-3 py-2.5 text-xs text-[rgba(254,205,211,0.95)]"
        >
          <span className="shrink-0 mt-0.5">
            <X className="h-3.5 w-3.5" />
          </span>
          <div>
            <div className="font-semibold">Couldn’t create channel</div>
            <div className="mt-0.5 text-[rgba(254,205,211,0.85)]">{submitError}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  icon: Icon,
  accent: accentKey,
  value,
}: {
  label: string;
  icon: IconComp;
  accent: string;
  value: string;
}) {
  const a = accentOf(accentKey);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <span className={`shrink-0 grid place-items-center h-8 w-8 rounded-md ${a.bg} ${a.fg}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-semibold uppercase tracking-wider text-[rgba(220,235,255,0.55)]">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm text-[rgba(236,245,255,0.95)] truncate">{value}</dd>
      </div>
    </div>
  );
}

function DirtyConfirm({
  onKeepEditing,
  onDiscard,
}: {
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="discard-title"
      className="absolute inset-0 grid place-items-center bg-black/50 backdrop-blur-sm z-10 px-4"
    >
      <div className="w-full max-w-sm rounded-xl border border-white/[0.1] bg-[color:var(--nav-bg)]/98 backdrop-blur-xl p-5 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)]">
        <h3 id="discard-title" className="text-sm font-semibold text-[rgba(236,245,255,0.98)]">
          Discard this draft?
        </h3>
        <p className="mt-1 text-xs text-[rgba(220,235,255,0.7)]">
          You’ll lose your name, description, template, and settings. This can’t be undone.
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onKeepEditing}
            autoFocus
            className="min-h-[36px] px-3 rounded-lg text-sm font-medium text-[rgba(220,235,255,0.85)] hover:text-white hover:bg-white/[0.05] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:hsl(var(--primary)/0.6)]"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="min-h-[36px] px-3 rounded-lg text-sm font-medium bg-[rgba(251,113,133,0.2)] text-[rgba(254,205,211,0.98)] border border-[rgba(251,113,133,0.4)] hover:bg-[rgba(251,113,133,0.28)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(251,113,133,0.6)]"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
