'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import { isAuthenticated } from '@/lib/auth';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Public routes that should never show sidebar
    const publicRoutes = ['/', '/login'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // Only show sidebar if user is authenticated AND not on a public route
    setShowSidebar(!isPublicRoute && isAuthenticated());
  }, [pathname, mounted]);

  if (!mounted) {
    // Prevent flash of sidebar on initial load
    return (
      <div className="flex flex-col h-screen">
        <Header />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">{children}</main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className={`flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-950 ${showSidebar ? 'overflow-hidden shadow-inner' : ''}`}>
          {children}
        </main>
      </div>
      <Footer />
    </>
  );
}
