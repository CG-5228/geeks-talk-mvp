"use client";
import { useState } from 'react';
import { Home, MessageCircle, Plus, Hash } from 'lucide-react';

interface Server {
  id: string;
  name: string;
  icon?: string;
  isActive?: boolean;
  hasNotifications?: boolean;
}

type ViewType = 'channels' | 'dms';

interface ServerRailProps {
  onViewChange?: (view: ViewType) => void;
}

export default function ServerRail({ onViewChange }: ServerRailProps) {
  const [activeView, setActiveView] = useState<ViewType>('channels');
  const [activeServer, setActiveServer] = useState('geeks-talk');

  // Mock servers - in a real app, this would come from props or API
  const servers: Server[] = [
    { id: 'home', name: 'Home', icon: '🏠', isActive: true },
    { id: 'geeks-talk', name: 'Geeks Talk', icon: '💬', hasNotifications: true },
    { id: 'dev-community', name: 'Dev Community', icon: '👨‍💻' },
    { id: 'gaming', name: 'Gaming', icon: '🎮' },
    { id: 'study-group', name: 'Study Group', icon: '📚' },
  ];

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    onViewChange?.(view);
  };

  return (
    <div className="w-[72px] h-full bg-[color:var(--nav-bg)]/60 backdrop-blur-xl border-r border-border/20 flex flex-col items-center py-3 space-y-2 overflow-y-auto">
      {/* Channels View (Home) */}
      <button
        onClick={() => handleViewChange('channels')}
        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group ${
          activeView === 'channels'
            ? 'bg-primary text-primary-foreground'
            : 'bg-white/10 hover:bg-white/20 text-[rgba(220,235,255,0.8)] hover:text-white'
        }`}
        title="Channels"
      >
        <Home className="w-6 h-6" />
        {activeView === 'channels' && (
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
        )}
      </button>

      {/* DMs View */}
      <button
        onClick={() => handleViewChange('dms')}
        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group ${
          activeView === 'dms'
            ? 'bg-primary text-primary-foreground'
            : 'bg-white/10 hover:bg-white/20 text-[rgba(220,235,255,0.8)] hover:text-white'
        }`}
        title="Direct Messages"
      >
        <MessageCircle className="w-6 h-6" />
        {activeView === 'dms' && (
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
        )}
      </button>

      {/* Divider */}
      <div className="w-8 h-px bg-border/20" />

      {/* Community Servers */}
      {servers.slice(1).map((server) => (
        <button
          key={server.id}
          onClick={() => setActiveServer(server.id)}
          className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group ${
            activeServer === server.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-white/10 hover:bg-white/20 text-[rgba(220,235,255,0.8)] hover:text-white'
          }`}
          title={server.name}
        >
          {server.icon ? (
            <span className="text-lg">{server.icon}</span>
          ) : (
            <Hash className="w-6 h-6" />
          )}
          
          {/* Active indicator */}
          {activeServer === server.id && (
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
          )}
          
          {/* Notification badge */}
          {server.hasNotifications && activeServer !== server.id && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          )}
        </button>
      ))}

      {/* Add Server Button */}
      <button
        className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-[rgba(220,235,255,0.8)] hover:text-white transition-all duration-200 flex items-center justify-center group"
        title="Add a Server"
      >
        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
      </button>

      {/* Explore Servers Button */}
      <button
        className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-[rgba(220,235,255,0.8)] hover:text-white transition-all duration-200 flex items-center justify-center group"
        title="Explore Public Servers"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">C</span>
        </div>
      </button>
    </div>
  );
}
