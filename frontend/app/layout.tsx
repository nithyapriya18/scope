import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Lumina Scope | AI-Driven RFP Response System',
    template: '%s | Lumina Scope',
  },
  description: 'AI-Driven RFP Response System for Primary Market Research',
  icons: { icon: '/petasight.png' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased`}>
        <ThemeProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
