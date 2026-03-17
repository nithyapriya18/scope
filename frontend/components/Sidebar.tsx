'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, Users, BookOpen, BarChart3, Settings, User, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/auth';

const navigation = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bids', href: '/opportunities', icon: FileText },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Study Library', href: '/study-library', icon: BookOpen },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-white dark:bg-neutral-950 flex-shrink-0 flex flex-col border-r border-border dark:border-neutral-800 relative transition-all duration-300`}>
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-10 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-foreground-secondary dark:text-white rounded-full p-1.5 shadow-lg border border-border dark:border-neutral-700 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="h-4" />

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'text-white bg-gradient-to-r from-primary to-secondary shadow-sm'
                  : 'text-foreground-secondary dark:text-neutral-300 hover:text-foreground dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
            </Link>
          );
        })}

        {/* Settings */}
        <div className="pt-4">
          {!collapsed && (
            <div className="text-[10px] font-semibold text-foreground-tertiary dark:text-neutral-500 uppercase tracking-wider px-3 mb-2">
              System
            </div>
          )}
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              pathname === '/settings'
                ? 'text-white bg-gradient-to-r from-primary to-secondary shadow-sm'
                : 'text-foreground-secondary dark:text-neutral-300 hover:text-foreground dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings size={20} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border dark:border-neutral-800 relative user-menu-container">
        {mounted && user ? (
          <>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'User menu' : undefined}
            >
              <div className="size-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <User className="text-white" size={18} />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-foreground dark:text-white truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-foreground-tertiary dark:text-neutral-400 truncate">
                    {user.email}
                  </p>
                </div>
              )}
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && !collapsed && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-border dark:border-neutral-700 overflow-hidden">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  <LogOut size={18} className="text-error dark:text-red-400" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-error dark:text-red-400">Logout</p>
                    <p className="text-xs text-foreground-tertiary dark:text-red-300">Sign out of account</p>
                  </div>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="size-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
              <User className="text-foreground-tertiary dark:text-neutral-400" size={18} />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground-tertiary dark:text-neutral-400 truncate">
                  Not logged in
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
