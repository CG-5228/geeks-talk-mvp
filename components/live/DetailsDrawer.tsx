"use client";
import type { Channel } from '@/types/live';

export default function DetailsDrawer({ channel, open, onClose, pinned = false, onTogglePin }: { channel: Channel | null; open: boolean; onClose: () => void; pinned?: boolean; onTogglePin?: () => void }) {
  // If pinned mode is desired, parent can set --details: 320px and pass pinned=true.
  if (pinned) {
    return (
      <aside className="w-full bg-[linear-gradient(180deg,var(--surface-2),var(--surface-1))] ring-1 ring-[color:var(--divider)]/50 backdrop-blur-xl h-[calc(100vh-var(--header-h)-var(--subnav-h,0px))]">
        <div className="h-12 flex items-center justify-between px-4 gap-2 border-b border-[color:var(--divider)]">
          <div className="font-semibold text-[rgba(236,245,255,0.95)]">Details</div>
          <div className="ml-auto flex items-center gap-2">
            {onTogglePin && (
              <button onClick={onTogglePin} className="text-[rgba(220,235,255,0.8)] hover:text-white text-xs">
                Unpin
              </button>
            )}
          </div>
        </div>
        <div className="p-4 text-[rgba(220,235,255,0.85)]">
          {channel ? (
            <div className="space-y-2">
              <div className="text-sm opacity-80">Channel</div>
              <div className="text-lg font-semibold">#{channel.name}</div>
              {channel.topic && (
                <div className="mt-2 text-sm">
                  <div className="opacity-80">Topic</div>
                  <div>{channel.topic}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="opacity-80">No channel selected.</div>
          )}
        </div>
      </aside>
    );
  }
  // Overlay mode: aside is a container with pointer-events-none; inner panel animates with translateX
  return (
    <aside className="pointer-events-none">
      <div
        className={`pointer-events-auto fixed right-0 top-[calc(var(--header-h)+var(--subnav-h,0px))] w-80 h-[calc(100vh-var(--header-h)-var(--subnav-h,0px))] transition-transform duration-200 will-change-transform bg-[linear-gradient(180deg,var(--surface-2),var(--surface-1))] ring-1 ring-[color:var(--divider)]/50 backdrop-blur-xl z-30 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!open}
      >
        <div className="h-12 flex items-center justify-between px-4 gap-2 border-b border-[color:var(--divider)]">
          <div className="font-semibold text-[rgba(236,245,255,0.95)]">Details</div>
          <div className="ml-auto flex items-center gap-2">
            {onTogglePin && (
              <button onClick={onTogglePin} className="text-[rgba(220,235,255,0.8)] hover:text-white text-xs">
                Pin
              </button>
            )}
            <button onClick={onClose} className="text-[rgba(220,235,255,0.8)] hover:text-white text-xs">Close</button>
          </div>
        </div>
        <div className="p-4 text-[rgba(220,235,255,0.85)]">
          {channel ? (
            <div className="space-y-2">
              <div className="text-sm opacity-80">Channel</div>
              <div className="text-lg font-semibold">#{channel.name}</div>
              {channel.topic && (
                <div className="mt-2 text-sm">
                  <div className="opacity-80">Topic</div>
                  <div>{channel.topic}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="opacity-80">No channel selected.</div>
          )}
        </div>
      </div>
    </aside>
  );
}
