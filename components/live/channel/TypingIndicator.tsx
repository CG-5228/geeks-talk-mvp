"use client";

interface TypingIndicatorProps {
  users: Array<{ id: string; name: string }>;
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const names = users.map((u) => u.name);
  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing…`
        : `${names[0]}, ${names[1]} and ${names.length - 2} other${names.length - 2 === 1 ? '' : 's'} are typing…`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="px-6 py-1 text-xs text-[rgba(220,235,255,0.65)] flex items-center gap-2"
    >
      <span className="inline-flex gap-1" aria-hidden>
        <span className="w-1.5 h-1.5 rounded-full bg-[rgba(220,235,255,0.5)] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[rgba(220,235,255,0.5)] animate-bounce" style={{ animationDelay: '120ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[rgba(220,235,255,0.5)] animate-bounce" style={{ animationDelay: '240ms' }} />
      </span>
      <span>{label}</span>
    </div>
  );
}
