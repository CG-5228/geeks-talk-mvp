'use client';

import { useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Users,
  Database,
  FileText,
  BookOpen,
  Video,
  Mail,
  Bell,
  Shield,
  Bug,
  Megaphone,
  Search,
  ChevronLeft,
  ChevronRight,
  UserCog,
  MessagesSquare,
  ScrollText,
  HeartPulse,
  Flag,
} from 'lucide-react';

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string;
  superOnly?: boolean;
};

type Group = {
  label: string;
  items: Item[];
};

interface AdminSidebarProps {
  adminHash: string;
  role?: 'super-admin' | 'moderator';
}

const STORAGE_KEY = 'gt-admin-sidebar-collapsed';

export default function AdminSidebar({ adminHash, role = 'moderator' }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const isSuperAdmin = role === 'super-admin';

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === '1') setCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {}
  }, [collapsed]);

  const groups: Group[] = useMemo(
    () => [
      {
        label: 'Overview',
        items: [
          { label: 'Dashboard', href: `/admin/${adminHash}/dashboard`, icon: BarChart3, keywords: 'stats home overview' },
        ],
      },
      {
        label: 'Community',
        items: [
          { label: 'Users', href: `/admin/${adminHash}/users`, icon: Users, keywords: 'members accounts' },
          { label: 'User Reports', href: `/admin/${adminHash}/reports`, icon: Shield, keywords: 'abuse moderation flag' },
          { label: 'Channels & Groups', href: `/admin/${adminHash}/channels-groups`, icon: MessagesSquare, keywords: 'rooms voice' },
        ],
      },
      {
        label: 'Content',
        items: [
          { label: 'Blog', href: `/admin/${adminHash}/blog`, icon: BookOpen, keywords: 'posts articles writing' },
          { label: 'Tutorials', href: `/admin/${adminHash}/tutorials`, icon: Video, keywords: 'videos learn' },
          { label: 'Site Banner', href: `/admin/${adminHash}/site-banner`, icon: Megaphone, keywords: 'announcement notice', superOnly: true },
        ],
      },
      {
        label: 'Operations',
        items: [
          { label: 'Bug Reports', href: `/admin/${adminHash}/bugs`, icon: Bug, keywords: 'issues errors' },
          { label: 'Contact', href: `/admin/${adminHash}/contact`, icon: Mail, keywords: 'inbox messages' },
          { label: 'Notifications', href: `/admin/${adminHash}/notifications`, icon: Bell, keywords: 'alerts updates' },
          { label: 'Broadcast', href: `/admin/${adminHash}/broadcast`, icon: Megaphone, keywords: 'announce notify blast send', superOnly: true },
        ],
      },
      {
        label: 'System',
        items: [
          { label: 'System Health', href: `/admin/${adminHash}/system`, icon: HeartPulse, keywords: 'status uptime latency metrics monitoring' },
          { label: 'Feature Flags', href: `/admin/${adminHash}/feature-flags`, icon: Flag, keywords: 'toggles rollout gate experiment', superOnly: true },
          { label: 'Audit Log', href: `/admin/${adminHash}/audit-log`, icon: ScrollText, keywords: 'history actions trail' },
          { label: 'Database', href: `/admin/${adminHash}/database`, icon: Database, keywords: 'tables records sql', superOnly: true },
          { label: 'Files', href: `/admin/${adminHash}/files`, icon: FileText, keywords: 'uploads storage s3', superOnly: true },
          { label: 'Admins', href: `/admin/${adminHash}/admins`, icon: UserCog, keywords: 'roles permissions grants', superOnly: true },
        ],
      },
    ],
    [adminHash],
  );

  const roleScopedGroups = useMemo(() => {
    if (isSuperAdmin) return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((i) => !i.superOnly) }))
      .filter((g) => g.items.length > 0);
  }, [groups, isSuperAdmin]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roleScopedGroups;
    return roleScopedGroups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            (i.keywords ?? '').toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [roleScopedGroups, query]);

  const widthCls = collapsed ? 'w-[68px]' : 'w-64';

  return (
    <aside
      className={`${widthCls} shrink-0 sticky top-0 h-screen flex flex-col border-r border-white/10 bg-background/80 backdrop-blur-xl transition-[width] duration-200`}
    >
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground truncate">Admin</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto h-7 w-7 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search admin navigation"
              className="w-full pl-8 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
            />
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {filteredGroups.length === 0 && !collapsed && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">No matches</div>
        )}
        {filteredGroups.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <button
                      type="button"
                      onClick={() => router.push(item.href)}
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-primary/15 text-foreground'
                          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                      } ${collapsed ? 'justify-center' : ''}`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary" aria-hidden />
                      )}
                      <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/10 p-3 text-[11px] text-muted-foreground">
          Session expires hourly · refresh auto-redirects
        </div>
      )}
    </aside>
  );
}
