"use client";
import { useCallback, useEffect, useRef, useState } from 'react';

const KEY_PREFIX = 'geekstalk:draft:v1:';
const MAX_LEN = 4000;

function storageKey(scope: string | null | undefined) {
  if (!scope) return null;
  return `${KEY_PREFIX}${scope}`;
}

function safeRead(key: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function safeWrite(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    if (value) window.localStorage.setItem(key, value.slice(0, MAX_LEN));
    else window.localStorage.removeItem(key);
  } catch {
    // storage full / disabled — drafts are best-effort
  }
}

/**
 * Persists a composer draft per conversation (channel id / DM conversation id).
 * Reads synchronously on mount/scope-change so the input never flashes empty,
 * and writes on every update so switching channels mid-sentence never loses work.
 */
export function useMessageDraft(scope: string | null | undefined) {
  const [value, setValue] = useState<string>(() => {
    const key = storageKey(scope);
    return key ? safeRead(key) : '';
  });
  const scopeRef = useRef(scope);

  useEffect(() => {
    scopeRef.current = scope;
    const key = storageKey(scope);
    setValue(key ? safeRead(key) : '');
  }, [scope]);

  const update = useCallback((next: string) => {
    setValue(next);
    const key = storageKey(scopeRef.current);
    if (key) safeWrite(key, next);
  }, []);

  const clear = useCallback(() => {
    setValue('');
    const key = storageKey(scopeRef.current);
    if (key) safeWrite(key, '');
  }, []);

  return { value, update, clear };
}
