'use client';

import Link from 'next/link';
import { LogOut, User, LayoutDashboard, UserCheck, Settings, ChevronDown, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser, logout, isAuthenticated } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import Image from 'next/image';
import { useRunningPipeline } from '@/contexts/RunningPipelineContext';

const appNav = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'HCP Panel', href: '/hcp-panel', icon: UserCheck },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [authed, setAuthed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [navGuardOpen, setNavGuardOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { running } = useRunningPipeline();

  useEffect(() => {
    setUser(getCurrentUser());
    setAuthed(isAuthenticated());
  }, [pathname]);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isLandingPage = pathname === '/';
  const showAppNav = authed && !isLandingPage;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    // If a pipeline is running and we're navigating away from that opportunity's page, show guard
    if (running && pathname.includes(running.opportunityId) && !pathname.startsWith(href)) {
      e.preventDefault();
      setPendingHref(href);
      setNavGuardOpen(true);
    }
  };

  const handleNavGuardContinue = () => {
    setNavGuardOpen(false);
    if (pendingHref) router.push(pendingHref);
    setPendingHref(null);
  };

  return (
    <>
    <header className="bg-white dark:bg-neutral-950 border-b border-gray-200 dark:border-neutral-800 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center h-14 px-6">

        {/* Branding — fixed left */}
        <div className="flex-1 flex items-center">
          <Link href={authed ? '/dashboard' : '/'} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0">
            <Image src="/petasight.png" alt="PetaSight" width={24} height={24} className="object-contain" priority unoptimized />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] tracking-widest text-gray-900 dark:text-white font-normal">
                PETA<span className="font-bold">SIGHT</span>
              </span>
              <span className="text-[10px] font-bold tracking-wide text-primary">Lumina Scope</span>
            </div>
          </Link>
        </div>

        {/* Nav — absolute center */}
        {showAppNav && (
          <nav className="flex items-center gap-1">
            {appNav.map(item => {
              const active = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(item.href, e)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
                      : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={15} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Landing nav — center */}
        {isLandingPage && (
          <nav className="flex items-center gap-1">
            <a href="#features" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Features</a>
            <a href="#contact" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Contact</a>
          </nav>
        )}

        {/* Right side — fixed right */}
        <div className="flex-1 flex justify-end">
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {isLandingPage && (
            <>
              <Link href="/login" className="px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors">Log In</Link>
              <Link href="/login" className="px-4 py-1.5 text-sm font-medium text-white bg-primary hover:opacity-90 rounded-lg transition-colors">Sign Up</Link>
            </>
          )}

          {/* User profile pill */}
          {showAppNav && user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-white" />
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">{user.name || user.email.split('@')[0]}</p>
                  <p className="text-[10px] text-gray-500 dark:text-neutral-400 truncate max-w-[120px]">{user.email}</p>
                </div>
                <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-gray-200 dark:border-neutral-700 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-700">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{user.name || 'User'}</p>
                    <p className="text-[11px] text-gray-500 dark:text-neutral-400 truncate mt-0.5">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </header>

    {/* Navigation Guard Modal */}
    {navGuardOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Pipeline is running</h3>
              <p className="text-xs text-gray-500 dark:text-neutral-400 truncate max-w-[200px]">{running?.opportunityTitle}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-neutral-300 mb-5">
            This bid is actively processing. If you leave now, the current step will finish and the pipeline will pause until you return.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { setNavGuardOpen(false); setPendingHref(null); }}
              className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Stay on page
            </button>
            <button
              onClick={handleNavGuardContinue}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-primary hover:opacity-90 rounded-lg transition-colors"
            >
              Continue in background
            </button>
          </div>
          <button
            onClick={handleNavGuardContinue}
            className="w-full mt-2 px-4 py-2 text-sm font-semibold text-primary border border-primary/30 hover:bg-primary/5 rounded-lg transition-colors"
          >
            Pause after this step
          </button>
        </div>
      </div>
    )}
    </>
  );
}
