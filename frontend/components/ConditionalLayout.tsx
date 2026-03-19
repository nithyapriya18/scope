'use client';

import Header from './Header';
import Footer from './Footer';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-slate-950">
        {children}
      </main>
      <Footer />
    </>
  );
}
