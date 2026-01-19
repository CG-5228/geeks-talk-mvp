'use client';
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
  Megaphone
} from 'lucide-react';

interface AdminSidebarProps {
  adminHash: string;
}

export default function AdminSidebar({ adminHash }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const menuItems = [
    {
      label: 'Dashboard',
      href: `/admin/${adminHash}/dashboard`,
      icon: BarChart3,
      color: 'text-blue-400'
    },
    {
      label: 'User Management',
      href: `/admin/${adminHash}/users`,
      icon: Users,
      color: 'text-green-400'
    },
    {
      label: 'Database',
      href: `/admin/${adminHash}/database`,
      icon: Database,
      color: 'text-purple-400'
    },
    {
      label: 'File Management',
      href: `/admin/${adminHash}/files`,
      icon: FileText,
      color: 'text-orange-400'
    },
    {
      label: 'Blog',
      href: `/admin/${adminHash}/blog`,
      icon: BookOpen,
      color: 'text-pink-400'
    },
    {
      label: 'Tutorial Videos',
      href: `/admin/${adminHash}/tutorials`,
      icon: Video,
      color: 'text-cyan-400'
    },
    {
      label: 'Contact Messages',
      href: `/admin/${adminHash}/contact`,
      icon: Mail,
      color: 'text-yellow-400'
    },
    {
      label: 'Bug Reports',
      href: `/admin/${adminHash}/bugs`,
      icon: Bug,
      color: 'text-red-400'
    },
    {
      label: 'User Reports',
      href: `/admin/${adminHash}/reports`,
      icon: Shield,
      color: 'text-red-400'
    },
    {
      label: 'Notifications',
      href: `/admin/${adminHash}/notifications`,
      icon: Bell,
      color: 'text-indigo-400'
    },
    {
      label: 'Site Banner',
      href: `/admin/${adminHash}/site-banner`,
      icon: Megaphone,
      color: 'text-amber-400'
    },
    {
      label: 'Channel & Group Management',
      href: `/admin/${adminHash}/channels-groups`,
      icon: Users,
      color: 'text-emerald-400'
    },
    {
      label: 'Admin Management',
      href: `/admin/${adminHash}/admins`,
      icon: Shield,
      color: 'text-red-400'
    }
  ];
  
  return (
    <div className="w-64 bg-white/5 border-r border-white/10 h-screen overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-bold text-white mb-8">Admin Console</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${item.color}`} />
                <span className="font-medium">{item.label}</span>
                {item.label === 'Blog' && (
                  <span className="ml-auto text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                    Coming Soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
