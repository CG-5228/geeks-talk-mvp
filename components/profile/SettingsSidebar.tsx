"use client";

import { User, Palette, Bell, Shield, Key } from 'lucide-react';

type Section = 'profile' | 'appearance' | 'notifications' | 'privacy' | 'account';

export default function SettingsSidebar({ 
  activeSection, 
  onSectionChange 
}: { 
  activeSection: Section; 
  onSectionChange: (section: Section) => void;
}) {
  const sections = [
    { id: 'profile' as Section, label: 'Profile', icon: User },
    { id: 'appearance' as Section, label: 'Appearance', icon: Palette },
    { id: 'notifications' as Section, label: 'Notifications', icon: Bell },
    { id: 'privacy' as Section, label: 'Privacy & Security', icon: Shield },
    { id: 'account' as Section, label: 'Account', icon: Key },
  ];

  return (
    <nav className="space-y-1" aria-label="Settings navigation">
      {sections.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onSectionChange(id)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
            activeSection === id
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
          }`}
          aria-current={activeSection === id ? 'page' : undefined}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

