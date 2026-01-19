'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { X, Check } from 'lucide-react';
import { THEMES } from './theme-config';

interface ThemePanelProps {
  open: boolean;
  onClose: () => void;
}

export function ThemePanel({ open, onClose }: ThemePanelProps) {
  const { theme, setTheme } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Focus the panel when it opens
      panelRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const handleThemeSelect = (themeId: string) => {
    setTheme(themeId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        ref={panelRef}
        className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full p-6 focus:outline-none"
        tabIndex={-1}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Choose Theme</h2>
          <button
            onClick={onClose}
            aria-label="Close theme panel"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEMES.map((themeOption) => (
            <button
              key={themeOption.id}
              data-theme={themeOption.id}
              onClick={() => handleThemeSelect(themeOption.id)}
              className={`relative rounded-xl p-4 border-2 transition-all hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                theme === themeOption.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              aria-label={`Select ${themeOption.label} theme`}
            >
              {/* Large background preview */}
              <div className="h-32 rounded-lg bg-base-100 mb-3" />

              {/* Color dots */}
              {themeOption.id !== 'system' && (
                <div className="flex gap-2 mb-2">
                  {themeOption.preview.map((token, index) => (
                    <span
                      key={index}
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: token.color }}
                      title={`${token.name} color`}
                    />
                  ))}
                </div>
              )}

              {/* Title */}
              <div className="font-medium text-base-content text-left">{themeOption.label}</div>

              {/* Checkmark badge */}
              {theme === themeOption.id && (
                <div className="absolute top-2 right-2 bg-primary text-primary-content rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
