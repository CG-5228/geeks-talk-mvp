"use client";

import { useState } from 'react';
import ThemeSwitch from '@/components/ThemeSwitch';

export default function AppearanceSection() {
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize how Geeks Talk looks for you
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Theme
          </label>
          <ThemeSwitch />
          <p className="mt-2 text-xs text-muted-foreground">
            Choose between our Black and Nix dark themes
          </p>
        </div>

        <div className="h-px bg-border/20" />

        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Font size
          </label>
          <div className="flex gap-2">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                  fontSize === size
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-card/30 border border-border/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Adjust the base font size (coming soon)
          </p>
        </div>

        <div className="h-px bg-border/20" />

        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="compact-mode" className="block text-sm font-medium text-foreground">
              Compact mode
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Reduce spacing for a denser layout (coming soon)
            </p>
          </div>
          <button
            id="compact-mode"
            role="switch"
            aria-checked={compactMode}
            onClick={() => setCompactMode(!compactMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              compactMode ? 'bg-primary' : 'bg-muted/30'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                compactMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

