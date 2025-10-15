"use client";

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export default function ThemeColor() {
  const { theme } = useTheme();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const css = getComputedStyle(document.documentElement);
    const overscroll = css.getPropertyValue('--overscroll').trim();
    const value = overscroll ? `hsl(${overscroll})` : '#0d0f10';
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = value;
  }, [theme]);

  return null;
}
