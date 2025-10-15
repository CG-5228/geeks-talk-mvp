"use client";

import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function NeonAuthShell({ title, subtitle, children }: Props) {
  return (
    <div className="relative min-h-[calc(100dvh-4rem)] flex items-center justify-center py-12 overflow-visible">
      {/* Subtle dotted grid overlay above particles but below card */}
      <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.08]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(255,255,255,0.14) 19px, transparent 20px), repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(255,255,255,0.14) 19px, transparent 20px)" }} />

      <div className="relative z-20 w-full max-w-md px-6">
        <div className="relative rounded-2xl border border-[rgba(0,212,255,0.3)] bg-[rgba(0,0,0,0.6)] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,212,255,0.2),_inset_0_0_16px_rgba(0,212,255,0.15)] overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:shadow-[0_0_80px_20px_rgba(0,212,255,0.15)]">
          <div className="pointer-events-none absolute -inset-1 animate-[neon-sweep_6s_linear_infinite] bg-[radial-gradient(60%_60%_at_50%_0%,hsla(var(--neon)/0.25),transparent_60%)]" />
          <div className="relative p-6 sm:p-8 animate-neon-enter">
            <div className="mb-6 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#e8fcff] [text-shadow:0_0_12px_rgba(0,212,255,0.6)]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-sm text-[rgba(220,240,255,0.8)]">{subtitle}</p>
              ) : null}
            </div>
            {children}
          </div>
          <div className="relative">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[hsla(var(--neon)/0.45)] to-transparent animate-[shimmer-line_3s_linear_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
}
