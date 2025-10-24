"use client";
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronDown, Search } from 'lucide-react';
import type { Channel, LiveCounts, DMConversation } from '@/types/live';
import DMList from '@/components/live/dm/DMList';
import UnreadBadge from '@/components/live/indicators/UnreadBadge';
import ChannelDropdownMenu from '@/components/live/ChannelDropdownMenu';

export default function ChatsSidebar({ 
  channels, 
  activeId, 
  counts, 
  onSelect, 
  onCreate,
  dmConversations = [],
  activeDMId = null,
  onSelectDM,
  onStartDM,
  onShowFriends,
  sidebarView = 'channels',
  onShowCreateModal,
  onDeleteChannel
}: {
  channels: Channel[];
  activeId: string | null;
  counts: LiveCounts;
  onSelect: (c: Channel) => void;
  onCreate: (name: string, topic?: string) => void;
  dmConversations?: DMConversation[];
  activeDMId?: string | null;
  onSelectDM?: (conversationId: string) => void;
  onStartDM?: (userId: string) => void;
  onShowFriends?: () => void;
  sidebarView?: 'channels' | 'dms';
  onShowCreateModal?: () => void;
  onDeleteChannel?: (channelId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['MAIN']));
  
  useEffect(() => {
    const v = localStorage.getItem('gt_chats_sidebar');
    const isCollapsed = v === '1';
    setCollapsed(isCollapsed);
    const root = document.documentElement;
    root.style.setProperty('--sidebar', isCollapsed ? '56px' : '320px');
  }, []);
  
  const toggle = () => {
    const nxt = !collapsed; setCollapsed(nxt); localStorage.setItem('gt_chats_sidebar', nxt ? '1' : '0');
    const root = document.documentElement;
    root.style.setProperty('--sidebar', nxt ? '56px' : '320px');
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Define category order for consistent sorting
  const CATEGORY_ORDER = ['General', 'Programming', 'Computer General', 'Mathematics', 'Cybersecurity'];

  // Sort channels by category order, then by name
  const sortChannelsByCategory = (channels: Channel[]) => {
    return [...channels].sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a.category);
      const bIndex = CATEGORY_ORDER.indexOf(b.category);
      
      // If same category, sort by name
      if (aIndex === bIndex) {
        return a.name.localeCompare(b.name);
      }
      
      // Sort by category order
      return aIndex - bIndex;
    });
  };

  // Organize channels by category with stable sorting
  const mainChannels = sortChannelsByCategory(
    channels.filter(c => CATEGORY_ORDER.includes(c.category))
  );
  const userChannels = channels.filter(c => c.category === 'Private');
  
  // Filter channels based on search
  const filteredMainChannels = mainChannels.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredUserChannels = userChannels.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteChannel = (channelId: string) => {
    onDeleteChannel?.(channelId);
  };

  return (
    <aside className={`h-full flex flex-col border-r border-border/20 bg-[color:var(--nav-bg)]/50 backdrop-blur-xl w-[var(--sidebar,320px)] transition-all duration-300 ease-in-out overflow-hidden`}>
          {/* Header */}
          <div className="h-12 flex items-center justify-between px-4 flex-shrink-0">
            {!collapsed && (
              <div className="text-sm font-semibold text-[rgba(236,245,255,0.95)]">
                {sidebarView === 'dms' ? 'Direct Messages' : 'Geeks Talk'}
              </div>
            )}
            <button 
              onClick={toggle}
              className={`size-8 rounded-lg hover:bg-white/10 active:bg-white/15 grid place-items-center transition-all duration-150 text-[rgba(220,235,255,0.75)] hover:text-white ${collapsed ? 'mx-auto' : ''}`}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(220,235,255,0.5)]" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-border/20 rounded-lg text-sm text-[rgba(236,245,255,0.95)] placeholder:text-[rgba(220,235,255,0.5)] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all duration-150"
              aria-label="Search channels and users"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {sidebarView === 'dms' ? (
          /* Direct Messages View */
          <DMList
            conversations={dmConversations}
            activeConversationId={activeDMId}
            onSelectConversation={onSelectDM || (() => {})}
            onShowFriends={onShowFriends}
            onStartDM={onStartDM}
            collapsed={collapsed}
          />
        ) : (
          /* Channels View */
          <div className="px-2 py-2">
            {/* Main Channels */}
            <CategorySection
              title="MAIN"
              collapsed={collapsed}
              expanded={expandedCategories.has('MAIN')}
              onToggle={() => toggleCategory('MAIN')}
              count={filteredMainChannels.length}
            >
              {filteredMainChannels.map((c) => (
                <Row 
                  key={c.id} 
                  channel={c}
                  label={`# ${c.name}`} 
                  badge={counts[c.id] || 0} 
                  active={activeId === c.id} 
                  onClick={() => onSelect(c)} 
                  collapsed={collapsed}
                  onDeleteChannel={handleDeleteChannel}
                />
              ))}
            </CategorySection>

            {/* User Channels */}
            {filteredUserChannels.length > 0 && (
              <CategorySection
                title="YOUR CHANNELS"
                collapsed={collapsed}
                expanded={expandedCategories.has('YOUR_CHANNELS')}
                onToggle={() => toggleCategory('YOUR_CHANNELS')}
                count={filteredUserChannels.length}
              >
                {filteredUserChannels.map((c) => (
                  <Row 
                    key={c.id} 
                    channel={c}
                    label={`# ${c.name}`} 
                    badge={counts[c.id] || 0} 
                    active={activeId === c.id} 
                    onClick={() => onSelect(c)} 
                    collapsed={collapsed}
                    onDeleteChannel={handleDeleteChannel}
                  />
                ))}
              </CategorySection>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {sidebarView === 'channels' && (
        <div className="flex-shrink-0 p-2">
          <button
            onClick={() => onShowCreateModal?.()}
            className="w-full text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 ring-1 ring-border/20"
            aria-label="Add Channel"
          >
            {collapsed ? '+' : '+ Add Channel'}
          </button>
        </div>
      )}
    </aside>
  );
}

function CategorySection({ 
  title, 
  children, 
  collapsed, 
  expanded, 
  onToggle, 
  count 
}: { 
  title: string; 
  children: React.ReactNode; 
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  count: number;
}) {
  return (
    <div className="mb-2">
      {!collapsed ? (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-2 py-1.5 text-[13px] font-medium text-[rgba(220,235,255,0.65)] hover:text-[rgba(220,235,255,0.9)] hover:bg-white/5 rounded-md transition-all duration-150"
        >
          <div className="flex items-center gap-1.5">
            <ChevronDown 
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                expanded ? 'rotate-0' : '-rotate-90'
              }`} 
            />
            <span className="uppercase tracking-wider">{title}</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-[rgba(220,235,255,0.5)]">{count}</span>
        </button>
      ) : (
        <div className="h-2" />
      )}
      {expanded && <div className="space-y-1">{children}</div>}
    </div>
  );
}

function Row({ channel, label, badge, active, onClick, collapsed, onDeleteChannel }: { 
  channel: Channel; 
  label: string; 
  badge?: number; 
  active?: boolean; 
  onClick: () => void; 
  collapsed: boolean;
  onDeleteChannel?: (channelId: string) => void;
}) {
  return (
    <div className={`group flex items-center gap-2 ${collapsed ? 'justify-center px-1 mx-1' : 'px-2'} py-2 rounded-md hover:bg-white/5 active:bg-white/8 transition-all duration-150 ${active ? 'bg-white/10 ring-1 ring-primary/20' : ''}`}>
      <button
        onClick={onClick}
        className={`flex-1 flex items-center ${collapsed ? 'justify-center' : 'gap-2'} min-w-0`}
        title={collapsed ? label : undefined}
      >
        <span className={`text-[rgba(236,245,255,0.9)] text-sm ${collapsed ? 'w-full text-center' : 'truncate'}`}>
          {collapsed ? '#' : label}
        </span>
        {!collapsed && badge && badge > 0 && (
          <UnreadBadge count={badge} type="channel" />
        )}
      </button>
      
      {/* Three-dot menu - only show for user-created channels and when not collapsed */}
      {!collapsed && channel.category === 'Private' && onDeleteChannel && (
        <ChannelDropdownMenu
          channelId={channel.id}
          channelName={channel.name}
          isOwner={true}
          onDeleteChannel={onDeleteChannel}
        />
      )}
    </div>
  );
}
