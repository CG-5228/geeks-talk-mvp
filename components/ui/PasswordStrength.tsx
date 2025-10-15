"use client";

import React from "react";

function score(password: string) {
  let s = 0;
  if (password.length >= 8) s++;
  if (/[A-Z]/.test(password)) s++;
  if (/[a-z]/.test(password)) s++;
  if (/[0-9]/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  return Math.min(4, s);
}

export default function PasswordStrength({ value }: { value: string }) {
  const s = score(value);
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;
  const colors = [
    "bg-red-500/70",
    "bg-orange-500/70",
    "bg-yellow-500/70",
    "bg-emerald-500/70",
    "bg-emerald-600/80",
  ];
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 w-1/4 rounded ${i < s ? colors[Math.max(1, s)] : "bg-[color:var(--border)]/50"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{labels[s]}</p>
    </div>
  );
}
