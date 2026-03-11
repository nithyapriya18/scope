'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, BookOpen, BarChart3, Settings, Package, User } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bids', href: '/opportunities', icon: FileText },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Study Library', href: '/study-library', icon: BookOpen },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());
  }, []);

  return (
    <aside className="w-64 bg-navy-sidebar flex-shrink-0 flex flex-col rounded-r-2xl">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="size-8 bg-primary rounded-xl flex items-center justify-center">
          <Package className="text-white" size={20} />
        </div>
        <h1 className="text-white text-xl font-bold tracking-tight">Lumina</h1>
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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-white bg-primary'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}

        {/* Settings - moved here */}
        <div className="pt-4">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            System
          </div>
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              pathname === '/settings'
                ? 'text-white bg-primary'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings size={20} />
            <span className="text-sm font-medium">Settings</span>
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="size-8 rounded-full bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center flex-shrink-0">
            <User className="text-white" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate" suppressHydrationWarning>
              {mounted ? (user?.name || 'Demo User') : 'Demo User'}
            </p>
            <p className="text-xs text-slate-400 truncate" suppressHydrationWarning>
              {mounted ? (user?.role || 'Research Director') : 'Research Director'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
