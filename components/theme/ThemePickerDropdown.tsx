'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Layers, Check } from 'lucide-react';
import { THEMES, displayName } from './theme-config';

export function ThemePickerDropdown() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const { theme, resolvedTheme, systemTheme, setTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as Element).closest('.theme-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % THEMES.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + THEMES.length) % THEMES.length);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        const selectedTheme = THEMES[focusedIndex];
        if (selectedTheme) {
          setTheme(selectedTheme.id);
          setIsOpen(false);
          buttonRef.current?.focus();
        }
        break;
    }
  };

  const handleThemeSelect = (themeId: string) => {
    setTheme(themeId);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  if (!mounted) {
    return (
      <button 
        className="p-2.5 rounded-lg transition-all duration-200" 
        style={{ 
          color: 'hsl(var(--fg) / 0.5)',
          backgroundColor: 'hsl(var(--bg) / 0.05)',
          border: '1px solid hsl(var(--fg) / 0.1)'
        }}
      >
        <Layers className="w-5 h-5" />
      </button>
    );
  }

  const currentLabel = displayName(theme || 'system', resolvedTheme, systemTheme);

  return (
    <div className="relative theme-dropdown">
      <button
        ref={buttonRef}
        type="button"
        className="p-2.5 rounded-lg transition-all duration-200 hover:scale-105"
        style={{ 
          color: 'hsl(var(--fg) / 0.8)',
          backgroundColor: 'hsl(var(--bg) / 0.05)',
          border: '1px solid hsl(var(--fg) / 0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'hsl(var(--bg) / 0.1)';
          e.currentTarget.style.borderColor = 'hsl(var(--fg) / 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'hsl(var(--bg) / 0.05)';
          e.currentTarget.style.borderColor = 'hsl(var(--fg) / 0.1)';
        }}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Change theme"
        title={`Current theme: ${currentLabel}`}
      >
        <Layers className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 z-50 mt-2 w-64 rounded-xl shadow-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'hsl(var(--bg))',
            borderColor: 'hsl(var(--fg) / 0.15)',
            border: '1px solid',
            backdropFilter: 'blur(20px)'
          }}
          role="menu"
          aria-orientation="vertical"
        >
          {THEMES.map((themeOption, index) => (
            <button
              key={themeOption.id}
              className="flex items-center justify-between w-full px-5 py-4 text-left transition-all duration-200 group"
              style={{
                backgroundColor: index === focusedIndex ? 'hsl(var(--fg) / 0.08)' : 'transparent',
                borderBottom: index < THEMES.length - 1 ? '1px solid hsl(var(--fg) / 0.08)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (index !== focusedIndex) {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--fg) / 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (index !== focusedIndex) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              onClick={() => handleThemeSelect(themeOption.id)}
              onKeyDown={handleKeyDown}
              role="menuitemradio"
              aria-checked={theme === themeOption.id}
              tabIndex={-1}
            >
              <span className="text-sm font-semibold" style={{ color: 'hsl(var(--fg))' }}>
                {themeOption.label}
              </span>
              
              {themeOption.id !== 'system' && (
                <div className="flex gap-1.5">
                  {themeOption.preview.map((colorDef, index) => (
                    <span
                      key={index}
                      className="h-5 w-3 rounded-full"
                      style={{ backgroundColor: colorDef.color }}
                      title={`${colorDef.name} color`}
                    />
                  ))}
                </div>
              )}
              
              {theme === themeOption.id && (
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: 'hsl(var(--p))' }}
                  />
                  <Check className="w-4 h-4" style={{ color: 'hsl(var(--p))' }} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
