"use client";

// Flag to track if user has interacted with the page
let hasUserInteracted = false;
let pendingAudioElements: HTMLAudioElement[] = [];

/**
 * Initialize audio context after user interaction
 * This is required due to browser autoplay policies
 */
export function initializeUserInteraction() {
  if (hasUserInteracted) return;
  
  const handleInteraction = () => {
    hasUserInteracted = true;
    console.log('[audioUtils] User interaction detected, enabling audio');
    
    // Try to play any pending audio elements
    pendingAudioElements.forEach(async (element) => {
      try {
        await element.play();
        console.log('[audioUtils] Successfully played pending audio element');
      } catch (error) {
        console.warn('[audioUtils] Failed to play pending audio element:', error);
      }
    });
    pendingAudioElements = [];
    
    // Remove the event listeners after first interaction
    document.removeEventListener('click', handleInteraction);
    document.removeEventListener('touchstart', handleInteraction);
    document.removeEventListener('keydown', handleInteraction);
  };
  
  document.addEventListener('click', handleInteraction, { once: true });
  document.addEventListener('touchstart', handleInteraction, { once: true });
  document.addEventListener('keydown', handleInteraction, { once: true });
}

/**
 * Safely play an audio element, handling autoplay restrictions
 */
export async function safePlayAudio(audioElement: HTMLAudioElement): Promise<boolean> {
  try {
    await audioElement.play();
    console.log('[audioUtils] Audio playing successfully');
    return true;
  } catch (error: any) {
    if (error.name === 'NotAllowedError') {
      console.warn('[audioUtils] Autoplay blocked, waiting for user interaction');
      // Add to pending list
      if (!pendingAudioElements.includes(audioElement)) {
        pendingAudioElements.push(audioElement);
      }
      
      // Initialize user interaction handler if not already done
      initializeUserInteraction();
      return false;
    }
    console.error('[audioUtils] Error playing audio:', error);
    return false;
  }
}

/**
 * Create a new audio context, handling browser restrictions
 */
export function createAudioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.error('[audioUtils] AudioContext not supported');
      return null;
    }
    
    const ctx = new AudioContextClass();
    
    // If suspended, resume on user interaction
    if (ctx.state === 'suspended') {
      const resumeContext = () => {
        ctx.resume().then(() => {
          console.log('[audioUtils] AudioContext resumed');
        });
      };
      document.addEventListener('click', resumeContext, { once: true });
    }
    
    return ctx;
  } catch (error) {
    console.error('[audioUtils] Failed to create AudioContext:', error);
    return null;
  }
}

/**
 * Check if user has interacted with the page
 */
export function hasInteracted(): boolean {
  return hasUserInteracted;
}

/**
 * Force set the interaction flag (useful for when we know interaction has occurred)
 */
export function setInteracted(): void {
  hasUserInteracted = true;
}
