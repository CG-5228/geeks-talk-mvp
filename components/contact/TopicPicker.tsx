'use client';
import { MessageCircle, Handshake, Newspaper, LifeBuoy, CreditCard, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ContactTopic = 'general' | 'partnership' | 'press' | 'support' | 'billing' | 'feedback';

interface TopicMeta {
  id: ContactTopic;
  title: string;
  blurb: string;
  icon: LucideIcon;
  sla: string;
}

export const TOPICS: TopicMeta[] = [
  {
    id: 'general',
    title: 'General',
    blurb: 'Anything that doesn’t fit the other categories.',
    icon: MessageCircle,
    sla: 'Reply in ~1 business day',
  },
  {
    id: 'support',
    title: 'Support',
    blurb: 'Account issues, access, or something not working.',
    icon: LifeBuoy,
    sla: 'Reply in a few hours',
  },
  {
    id: 'feedback',
    title: 'Feedback',
    blurb: 'Ideas, requests, or thoughts on the product.',
    icon: Sparkles,
    sla: 'Read the same day',
  },
  {
    id: 'partnership',
    title: 'Partnership',
    blurb: 'Integrations, collaborations, and business deals.',
    icon: Handshake,
    sla: 'Reply within 2 business days',
  },
  {
    id: 'press',
    title: 'Press',
    blurb: 'Media inquiries, interviews, and coverage.',
    icon: Newspaper,
    sla: 'Reply within 2 business days',
  },
  {
    id: 'billing',
    title: 'Billing',
    blurb: 'Invoices, payments, and plan changes.',
    icon: CreditCard,
    sla: 'Reply within 1 business day',
  },
];

interface Props {
  value: ContactTopic;
  onChange: (next: ContactTopic) => void;
}

export default function TopicPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {TOPICS.map((t) => {
        const active = value === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={active}
            className={[
              'group relative text-left rounded-2xl p-4 border transition-all duration-200',
              'bg-[color:var(--card-bg)]/50 backdrop-blur-xl',
              active
                ? 'border-[color:hsl(var(--primary)/0.55)] ring-2 ring-[color:hsl(var(--primary)/0.35)] shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.45)]'
                : 'border-white/[0.08] hover:border-white/20 hover:bg-[color:var(--card-bg)]/70',
            ].join(' ')}
          >
            <div
              className={[
                'w-9 h-9 rounded-xl grid place-items-center transition',
                active
                  ? 'bg-[color:hsl(var(--primary)/0.18)] text-[color:hsl(var(--primary))]'
                  : 'bg-white/[0.04] text-[rgba(220,235,255,0.75)] group-hover:bg-white/[0.07]',
              ].join(' ')}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="mt-3 text-sm font-semibold text-[rgba(236,245,255,0.96)]">{t.title}</div>
            <div className="mt-1 text-xs text-[rgba(220,235,255,0.65)] leading-relaxed line-clamp-2">{t.blurb}</div>
            <div className="mt-3 text-[10px] uppercase tracking-[0.18em] font-semibold text-[rgba(220,235,255,0.5)]">
              {t.sla}
            </div>
            {active && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[color:hsl(var(--primary))] shadow-[0_0_10px_hsl(var(--primary))]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
