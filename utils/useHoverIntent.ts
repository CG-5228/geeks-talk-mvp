"use client";
import { RefObject, useEffect, useRef } from 'react';

export interface HoverIntentOptions {
  delay?: number; // open delay in ms
  onOpen: () => void;
  onClose: () => void;
  // Optional panel ref to coordinate leave
  panelRef?: RefObject<HTMLElement> | null;
  closeDelay?: number; // default 200ms
}

/**
 * useHoverIntent attaches mouseenter/leave listeners to a trigger element and schedules
 * open/close with small delays to avoid accidental flicker.
 */
export function useHoverIntent(triggerRef: RefObject<HTMLElement | null>, opts: HoverIntentOptions) {
  const { delay = 150, onOpen, onClose, panelRef = null, closeDelay = 200 } = opts;
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const clearOpen = () => {
      if (openTimer.current) {
        clearTimeout(openTimer.current);
        openTimer.current = null;
      }
    };
    const clearClose = () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
    };

    const scheduleOpen = () => {
      clearOpen();
      openTimer.current = setTimeout(() => onOpen(), delay);
    };

    const scheduleClose = () => {
      clearClose();
      closeTimer.current = setTimeout(() => onClose(), closeDelay);
    };

    const onEnter = () => {
      clearClose();
      scheduleOpen();
    };

    const onLeave = (e: MouseEvent) => {
      clearOpen();
      // If moving into the panel, don't close yet
      const panel = panelRef?.current;
      if (panel) {
        const to = e.relatedTarget as Node | null;
        if (to && panel.contains(to)) {
          return;
        }
      }
      scheduleClose();
    };

    trigger.addEventListener('mouseenter', onEnter);
    trigger.addEventListener('mouseleave', onLeave);

    return () => {
      trigger.removeEventListener('mouseenter', onEnter);
      trigger.removeEventListener('mouseleave', onLeave);
      clearOpen();
      clearClose();
    };
  }, [triggerRef, delay, closeDelay, onOpen, onClose, panelRef]);
}
