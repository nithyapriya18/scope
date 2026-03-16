'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, Users, BookOpen, BarChart3, Settings, Package, User, ChevronLeft, ChevronRight, LogOut, UserCircle } from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/auth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
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
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-pink-50 to-pink-100 dark:from-slate-800 dark:to-slate-900 flex-shrink-0 flex flex-col border-r border-pink-200 dark:border-slate-700 relative transition-all duration-300`}>
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-10 bg-white dark:bg-slate-700 hover:bg-pink-100 dark:hover:bg-slate-600 text-primary dark:text-white rounded-full p-1.5 shadow-lg border border-pink-200 dark:border-slate-600 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
          <Package className="text-white" size={22} />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-primary dark:text-white text-xl font-bold tracking-tight">Lumina</h1>
            <p className="text-xs text-pink-700 dark:text-slate-400">Scope</p>
          </div>
        )}
      </div>

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
                  ? 'text-white bg-primary shadow-lg'
                  : 'text-pink-900 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-pink-200/50 dark:hover:bg-slate-700/50'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-semibold">{item.name}</span>}
            </Link>
          );
        })}

        {/* Settings - moved here */}
        <div className="pt-4">
          {!collapsed && (
            <div className="text-[10px] font-bold text-pink-600 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">
              System
            </div>
          )}
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              pathname === '/settings'
                ? 'text-white bg-primary shadow-lg'
                : 'text-pink-900 dark:text-slate-300 hover:text-primary dark:hover:text-white hover:bg-pink-200/50 dark:hover:bg-slate-700/50'
            }`}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings size={20} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-semibold">Settings</span>}
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-pink-200 dark:border-slate-700 relative user-menu-container">
        {mounted && user ? (
          <>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-pink-200/50 dark:hover:bg-slate-700/50 transition-colors ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? 'User menu' : undefined}
            >
              <div className="size-10 rounded-full bg-gradient-to-br from-primary to-pink-600 flex items-center justify-center flex-shrink-0">
                <User className="text-white" size={18} />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-pink-900 dark:text-white truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-pink-700 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
              )}
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && !collapsed && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-pink-200 dark:border-slate-700 overflow-hidden">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={18} className="text-red-600 dark:text-red-400" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">Logout</p>
                    <p className="text-xs text-red-500 dark:text-red-300">Sign out of account</p>
                  </div>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="size-10 rounded-full bg-pink-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
              <User className="text-pink-700 dark:text-slate-400" size={18} />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-pink-700 dark:text-slate-400 truncate">
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
