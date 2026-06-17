"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Menu, X } from 'lucide-react';
import UserMenu from './header/UserMenu';
import { getLiveUrl } from '@/lib/getLiveUrl';

const NAV_LINKS = [
  { href: '/about', label: 'About', match: (p: string | null) => p === '/about' },
  { href: '/blog', label: 'Blog', match: (p: string | null) => !!p?.startsWith('/blog') },
  { href: '/contact', label: 'Contact', match: (p: string | null) => !!p?.startsWith('/contact') },
];

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const goLive = () => {
    const liveUrl = getLiveUrl('/text');
    if (!session?.user) {
      router.push(`/signin?callbackUrl=${encodeURIComponent(liveUrl)}`);
    } else {
      window.location.href = liveUrl;
    }
  };

  return (
    <header
      className={[
        'sticky top-0 inset-x-0 z-50 w-full transition-[background,border-color,backdrop-filter] duration-300',
        scrolled
          ? 'bg-[#0a0c0e]/80 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent border-b border-transparent',
      ].join(' ')}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link
              href="/"
              aria-label="Geeks Talk home"
              className="shrink-0 font-semibold text-lg tracking-tight text-[rgba(236,245,255,0.95)] hover:text-white transition-colors"
            >
              Geeks Talk
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm">
              {NAV_LINKS.map(({ href, label, match }) => {
                const active = match(pathname);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'relative px-3 py-1.5 rounded-md transition-colors',
                      active
                        ? 'text-white'
                        : 'text-[rgba(220,235,255,0.75)] hover:text-white hover:bg-white/[0.04]',
                    ].join(' ')}
                  >
                    {label}
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-3 right-3 -bottom-px h-px bg-gradient-to-r from-transparent via-[color:hsl(var(--primary))] to-transparent"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 ml-auto whitespace-nowrap">
            <button
              onClick={goLive}
              type="button"
              className="group inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_0_18px_hsl(var(--primary)/0.35)] hover:shadow-[0_0_24px_hsl(var(--primary)/0.55)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-white/80 animate-live-dot" />
              </span>
              Live
            </button>
            {!session?.user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/signin"
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-[rgba(220,235,255,0.85)] hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full px-4 py-1.5 text-sm font-medium border border-white/[0.08] bg-[color:var(--card-bg)]/50 backdrop-blur-xl text-[rgba(236,245,255,0.95)] hover:border-[color:hsl(var(--primary)/0.35)] hover:-translate-y-0.5 transition-all duration-200"
                >
                  Sign up
                </Link>
              </div>
            ) : (
              <UserMenu />
            )}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.08] bg-[color:var(--card-bg)]/50 backdrop-blur-xl text-[rgba(236,245,255,0.95)] hover:border-[color:hsl(var(--primary)/0.35)] transition-colors"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div
          id="mobile-nav"
          className={[
            'md:hidden overflow-hidden transition-[max-height,opacity] duration-300',
            mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0',
          ].join(' ')}
        >
          <nav className="pt-2 pb-4 flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label, match }) => {
              const active = match(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-[color:hsl(var(--primary)/0.1)] text-white border border-[color:hsl(var(--primary)/0.25)]'
                      : 'text-[rgba(220,235,255,0.85)] hover:text-white hover:bg-white/[0.04] border border-transparent',
                  ].join(' ')}
                >
                  {label}
                </Link>
              );
            })}
            {!session?.user && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link
                  href="/signin"
                  className="rounded-md px-3 py-2 text-sm text-center text-[rgba(236,245,255,0.9)] border border-white/[0.08] bg-[color:var(--card-bg)]/50 backdrop-blur-xl hover:border-[color:hsl(var(--primary)/0.35)] transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md px-3 py-2 text-sm text-center font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_0_18px_hsl(var(--primary)/0.35)]"
                >
                  Sign up
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
