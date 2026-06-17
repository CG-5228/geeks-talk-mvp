"use client";

/**
 * Shimmer placeholder shown while the first page of messages loads so the
 * surface never flashes blank. Lengths vary per row to read as a real thread.
 */
export default function MessageSkeleton({ count = 5 }: { count?: number }) {
  const rows = Array.from({ length: count });
  return (
    <div className="flex-1 px-6 py-4 space-y-6" aria-hidden="true">
      {rows.map((_, i) => {
        const bubbleWidths = ['w-56', 'w-72', 'w-40', 'w-64', 'w-48'];
        const descWidths = ['w-32', 'w-24', 'w-36', 'w-28', 'w-20'];
        const w = bubbleWidths[i % bubbleWidths.length];
        const dw = descWidths[i % descWidths.length];
        return (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-white/[0.08] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className={`h-3 ${dw} rounded bg-white/[0.09]`} />
                <div className="h-2.5 w-10 rounded bg-white/[0.06]" />
              </div>
              <div className={`mt-2 h-9 ${w} max-w-full rounded-2xl bg-white/[0.07]`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
