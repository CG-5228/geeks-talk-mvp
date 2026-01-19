export const THEMES = [
  { 
    id: 'gt-original', 
    label: 'GT Original', 
    preview: [
      { color: 'hsl(190 100% 55%)', name: 'cyan' },
      { color: 'hsl(210 100% 60%)', name: 'blue' },
      { color: 'hsl(340 80% 60%)', name: 'pink' },
      { color: 'hsl(220 15% 25%)', name: 'gray' }
    ]
  },
  { 
    id: 'light', 
    label: 'Light', 
    preview: [
      { color: 'hsl(210 100% 50%)', name: 'blue' },
      { color: 'hsl(270 60% 50%)', name: 'purple' },
      { color: 'hsl(340 80% 55%)', name: 'pink' },
      { color: 'hsl(220 20% 20%)', name: 'dark-gray' }
    ]
  },
  { 
    id: 'dark', 
    label: 'Dark', 
    preview: [
      { color: 'hsl(190 100% 55%)', name: 'cyan' },
      { color: 'hsl(210 100% 60%)', name: 'blue' },
      { color: 'hsl(340 80% 60%)', name: 'pink' },
      { color: 'hsl(220 15% 25%)', name: 'gray' }
    ]
  },
  { 
    id: 'synthwave', 
    label: 'Synthwave', 
    preview: [
      { color: 'hsl(321 70% 52%)', name: 'pink' },
      { color: 'hsl(265 89% 78%)', name: 'purple' },
      { color: 'hsl(174 60% 51%)', name: 'cyan' },
      { color: 'hsl(219 14% 28%)', name: 'purple-gray' }
    ]
  },
  { 
    id: 'black', 
    label: 'Black', 
    preview: [
      { color: 'hsl(190 100% 55%)', name: 'cyan' },
      { color: 'hsl(210 100% 60%)', name: 'blue' },
      { color: 'hsl(340 80% 60%)', name: 'pink' },
      { color: 'hsl(220 15% 25%)', name: 'gray' }
    ]
  },
  { 
    id: 'nix-light', 
    label: 'Nix Light', 
    preview: [
      { color: 'hsl(155 75% 45%)', name: 'green' },
      { color: 'hsl(170 70% 40%)', name: 'teal' },
      { color: 'hsl(185 80% 45%)', name: 'cyan' },
      { color: 'hsl(220 20% 20%)', name: 'dark-gray' }
    ]
  },
  { 
    id: 'nix-dark', 
    label: 'Nix Dark', 
    preview: [
      { color: 'hsl(155 75% 45%)', name: 'green' },
      { color: 'hsl(170 70% 40%)', name: 'teal' },
      { color: 'hsl(185 80% 45%)', name: 'cyan' },
      { color: 'hsl(220 15% 25%)', name: 'gray' }
    ]
  },
  { id: 'system', label: 'System', preview: [] },
];

export function displayName(themeId: string, resolvedTheme?: string, systemTheme?: string): string {
  if (themeId === 'system') {
    const resolved = systemTheme || resolvedTheme || 'dark';
    return `System (${resolved.charAt(0).toUpperCase() + resolved.slice(1)})`;
  }
  return THEMES.find(t => t.id === themeId)?.label || themeId;
}

export function isValidTheme(id: string): boolean {
  return THEMES.some(t => t.id === id);
}
