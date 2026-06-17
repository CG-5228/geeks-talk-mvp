'use client';

import { useState } from 'react';
import ThemeSwitch from '@/components/ThemeSwitch';
import { ToggleRow, SegmentedControl } from './SettingsToggle';

type Initial = {
  accentColor: string | null;
  fontScale: 'sm' | 'md' | 'lg';
  reducedMotion: boolean;
  colorBlindMode: 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia';
};

const PRESET_COLORS = [
  '#00d4ff',
  '#7c3aed',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#ec4899',
  '#6366f1',
  '#facc15',
];

export default function AppearanceSection({ initial }: { initial: Initial }) {
  const [accentColor, setAccentColor] = useState<string>(initial.accentColor || '');
  const [fontScale, setFontScale] = useState<Initial['fontScale']>(initial.fontScale);
  const [reducedMotion, setReducedMotion] = useState(initial.reducedMotion);
  const [colorBlindMode, setColorBlindMode] = useState<Initial['colorBlindMode']>(
    initial.colorBlindMode,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accentColor: accentColor || null,
          fontScale,
          reducedMotion,
          colorBlindMode,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setMessage({ type: 'success', text: 'Appearance saved' });
      else setMessage({ type: 'error', text: d.error || 'Failed to save' });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize how Geeks Talk looks and feels.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Theme</h3>
        <ThemeSwitch />
      </div>

      <div className="h-px bg-border/20" />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Accent color</h3>
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setAccentColor(c)}
              className={`h-8 w-8 rounded-full border-2 transition ${
                accentColor.toLowerCase() === c.toLowerCase()
                  ? 'border-foreground scale-110'
                  : 'border-transparent'
              }`}
              style={{ background: c }}
              aria-label={`Accent ${c}`}
            />
          ))}
          <button
            onClick={() => setAccentColor('')}
            className={`px-3 h-8 rounded-full text-xs transition border ${
              !accentColor ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card/30 border-border/20 text-muted-foreground'
            }`}
          >
            System default
          </button>
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span>Custom</span>
            <input
              type="color"
              value={accentColor || '#00d4ff'}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-8 w-10 rounded cursor-pointer bg-transparent"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Applied to buttons, links, and highlights across the site.
        </p>
      </div>

      <div className="h-px bg-border/20" />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Font size</h3>
        <SegmentedControl
          ariaLabel="Font size"
          value={fontScale}
          onChange={setFontScale}
          options={[
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
          ]}
        />
      </div>

      <div className="h-px bg-border/20" />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Accessibility</h3>
        <ToggleRow
          label="Reduced motion"
          description="Minimize animations and transitions across the app."
          checked={reducedMotion}
          onChange={setReducedMotion}
        />
        <div className="pt-2">
          <div className="text-sm font-medium text-foreground mb-2">Color-blind assist</div>
          <SegmentedControl
            ariaLabel="Color-blind mode"
            value={colorBlindMode}
            onChange={setColorBlindMode}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'protanopia', label: 'Protanopia' },
              { value: 'deuteranopia', label: 'Deuteranopia' },
              { value: 'tritanopia', label: 'Tritanopia' },
            ]}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={pending}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save preferences'}
        </button>
        {message && (
          <div role="status" aria-live="polite" className={`text-sm ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
