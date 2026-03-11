import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import ConditionalLayout from '@/components/ConditionalLayout';

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
      <body className={`${inter.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-white antialiased`}>
        <ThemeProvider>
          <div className="flex flex-col h-screen overflow-hidden">
            <ConditionalLayout>{children}</ConditionalLayout>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
