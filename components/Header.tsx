"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import ThemeSwitch from './ThemeSwitch';
import UserMenu from './header/UserMenu';
import { useRef } from 'react';
import LiveDropdown from './nav/LiveDropdown';

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const liveBtnRef = useRef<HTMLButtonElement>(null);
  return (
    <header className="sticky top-0 inset-x-0 w-full z-50 bg-[#0d0f10]/80 backdrop-blur-lg border-b border-transparent">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Left group: logo + primary nav */}
          <div className="flex items-center gap-6 min-w-0">
            <Link
              href="/"
              className="shrink-0 font-semibold text-lg tracking-tight text-[rgba(236,245,255,0.95)] hover:text-white transition-colors"
            >
              Geeks Talk
            </Link>
            <nav className="hidden md:flex items-center gap-5 text-sm">
              <Link
                href="/about"
                className={`${pathname === '/about' ? 'text-white' : 'text-[rgba(220,235,255,0.85)] hover:text-white'} transition-colors`}
              >
                About
              </Link>
              <Link href="/blog" className={`${pathname?.startsWith('/blog') ? 'text-white' : 'text-[rgba(220,235,255,0.85)] hover:text-white'} transition-colors`}>Blog</Link>
              <Link href="/contact" className={`${pathname?.startsWith('/contact') ? 'text-white' : 'text-[rgba(220,235,255,0.85)] hover:text-white'} transition-colors`}>Contact Us</Link>
            </nav>
          </div>

          {/* Right group: theme switch + CTAs */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto whitespace-nowrap relative">
            <ThemeSwitch />
            <button
              id="nav-live"
              ref={liveBtnRef}
              className="btn-glow rounded-full px-4 py-2"
              aria-haspopup="menu"
              aria-expanded="false"
              aria-controls="live-dropdown"
              type="button"
            >
              Live
            </button>
            <LiveDropdown triggerRef={liveBtnRef as any} />
            {!session?.user ? (
              <>
                <Link href="/signup" className="btn-primary rounded-full px-4 py-2">Sign up</Link>
                <Link href="/signin" className="btn rounded-full px-4 py-2">Log in</Link>
              </>
            ) : (
              <UserMenu />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
