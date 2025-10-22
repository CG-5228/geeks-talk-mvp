"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MessageSquare, Mic, Video, PlaySquare } from 'lucide-react';
import UserMenu from '../header/UserMenu';
import AdminButton from '../admin/AdminButton';
interface LiveNavbarProps {
  onLogoClick: () => void;
}

export default function LiveNavbar({ onLogoClick }: LiveNavbarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onLogoClick();
  };

  const navItems = [
    { label: 'Text Chat', href: '/text', icon: MessageSquare, color: 'cyan' },
    { label: 'Voice Chat', href: '/voice', icon: Mic, color: 'purple' },
    { label: 'Video Chat', href: '/video', icon: Video, color: 'green' },
    { label: 'Tutorial Videos', href: '/tutorials', icon: PlaySquare, color: 'pink' }
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    const baseClasses = "relative px-4 py-2 rounded-lg transition-all duration-200 ease-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/20 backdrop-blur-sm";
    
    if (isActive) {
      switch (color) {
        case 'cyan':
          return `${baseClasses} text-[#00d9ff] bg-[#00d9ff]/10 border border-[#00d9ff]/30 shadow-[0_0_8px_rgba(0,217,255,0.2)]`;
        case 'purple':
          return `${baseClasses} text-[#b537ff] bg-[#b537ff]/10 border border-[#b537ff]/30 shadow-[0_0_8px_rgba(181,55,255,0.2)]`;
        case 'pink':
          return `${baseClasses} text-[#ff006e] bg-[#ff006e]/10 border border-[#ff006e]/30 shadow-[0_0_8px_rgba(255,0,110,0.2)]`;
        case 'green':
          return `${baseClasses} text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30 shadow-[0_0_8px_rgba(0,255,136,0.2)]`;
        default:
          return `${baseClasses} text-white bg-white/10 border border-white/20`;
      }
    } else {
      switch (color) {
        case 'cyan':
          return `${baseClasses} text-[#00d9ff]/60 hover:text-[#00d9ff] hover:bg-[#00d9ff]/8 hover:shadow-[0_0_6px_rgba(0,217,255,0.15)]`;
        case 'purple':
          return `${baseClasses} text-[#b537ff]/60 hover:text-[#b537ff] hover:bg-[#b537ff]/8 hover:shadow-[0_0_6px_rgba(181,55,255,0.15)]`;
        case 'pink':
          return `${baseClasses} text-[#ff006e]/60 hover:text-[#ff006e] hover:bg-[#ff006e]/8 hover:shadow-[0_0_6px_rgba(255,0,110,0.15)]`;
        case 'green':
          return `${baseClasses} text-[#00ff88]/60 hover:text-[#00ff88] hover:bg-[#00ff88]/8 hover:shadow-[0_0_6px_rgba(0,255,136,0.15)]`;
        default:
          return `${baseClasses} text-white/70 hover:text-white hover:bg-white/5`;
      }
    }
  };

  return (
    <header className="sticky top-0 inset-x-0 w-full z-50 bg-gradient-to-r from-[#0a0b0d]/60 via-[#0d0f10]/60 to-[#0a0b0d]/60 backdrop-blur-xl border-b border-white/10 shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left group: logo with neon glow */}
          <div className="flex items-center gap-6 min-w-0">
            <button
              onClick={handleLogoClick}
              className="shrink-0 font-bold text-xl tracking-tight text-[#00d9ff] hover:text-[#00d9ff] transition-all duration-200 hover:scale-105 cursor-pointer"
              style={{
                textShadow: '0 0 10px rgba(0,217,255,0.5), 0 0 20px rgba(0,217,255,0.3)',
                filter: 'drop-shadow(0 0 8px rgba(0,217,255,0.4))'
              }}
            >
              Geeks Talk Live
            </button>
          </div>

          {/* Center group: navigation items */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === '/text' && pathname === '/');
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={getColorClasses(item.color, isActive)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {isActive && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{
                        background: item.color === 'cyan' ? '#00d9ff' : 
                                   item.color === 'purple' ? '#b537ff' : 
                                   item.color === 'green' ? '#00ff88' : '#ff006e',
                        boxShadow: item.color === 'cyan' ? '0 0 8px rgba(0,217,255,0.4), 0 0 16px rgba(0,217,255,0.1)' :
                                   item.color === 'purple' ? '0 0 8px rgba(181,55,255,0.4), 0 0 16px rgba(181,55,255,0.1)' :
                                   item.color === 'green' ? '0 0 8px rgba(0,255,136,0.4), 0 0 16px rgba(0,255,136,0.1)' :
                                   '0 0 8px rgba(255,0,110,0.4), 0 0 16px rgba(255,0,110,0.1)'
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

                      {/* Right group: admin button and user menu */}
                      <div className="flex items-center gap-2 sm:gap-3 ml-auto whitespace-nowrap">
                        {session?.user && <AdminButton />}
                        {session?.user ? (
                          <UserMenu />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Link 
                              href="/signin" 
                              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                            >
                              Sign In
                            </Link>
                            <Link 
                              href="/signup" 
                              className="px-4 py-2 text-sm font-medium bg-[#00d9ff]/20 text-[#00d9ff] border border-[#00d9ff]/30 rounded-lg hover:bg-[#00d9ff]/30 hover:shadow-[0_0_10px_rgba(0,217,255,0.2)] transition-all duration-200"
                            >
                              Sign Up
                            </Link>
                          </div>
                        )}
                      </div>
        </div>
      </div>
    </header>
  );
}
