'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface QA {
  q: string;
  a: string;
}

const QAS: QA[] = [
  {
    q: 'How fast will I get a reply?',
    a: 'Support questions are usually answered the same day. General messages within one business day. Partnership and press inquiries within two business days.',
  },
  {
    q: 'I can’t sign in — what should I do?',
    a: 'Use the "Support" topic above and include your email and the page you were on when it broke. Screenshots speed things up.',
  },
  {
    q: 'Do you accept guest blog posts?',
    a: 'Not right now. We write most posts in-house, but send us a pitch under "Partnership" if you have something genuinely novel and we’ll consider it.',
  },
  {
    q: 'Is my message private?',
    a: 'Yes. Only Geeks Talk staff see contact messages. We never share them and delete attachments after a ticket is resolved.',
  },
  {
    q: 'Found a security issue?',
    a: 'Please email security@geekstalk.org directly — don’t post public reports. We respond to verified issues within 24 hours.',
  },
];

export default function ContactFAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[color:var(--card-bg)]/40 backdrop-blur-xl overflow-hidden divide-y divide-white/[0.06]">
      {QAS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between text-left px-5 py-4 hover:bg-white/[0.02] transition"
            >
              <span className="text-sm font-medium text-[rgba(236,245,255,0.95)] pr-4">{item.q}</span>
              <ChevronDown
                className={`w-4 h-4 text-[rgba(220,235,255,0.6)] flex-shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-[color:hsl(var(--primary))]' : ''
                }`}
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm text-[rgba(220,235,255,0.75)] leading-relaxed">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
