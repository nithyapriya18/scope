'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-[73px] h-[29px]" />;

  const isDark = theme === 'dark';

  return (
    <div className="flex items-center rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      <button
        onClick={() => setTheme('light')}
        aria-label="Light mode"
        className={`flex items-center justify-center w-[36px] h-[29px] transition-colors ${
          !isDark
            ? 'bg-white text-ps-primary-600'
            : 'bg-gray-800 text-gray-500 hover:text-gray-300'
        }`}
      >
        <Sun className="w-[15px] h-[15px]" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        aria-label="Dark mode"
        className={`flex items-center justify-center w-[36px] h-[29px] transition-colors ${
          isDark
            ? 'bg-gray-900 text-ps-primary-400'
            : 'bg-gray-100 text-gray-400 hover:text-gray-600'
        }`}
      >
        <Moon className="w-[15px] h-[15px]" />
      </button>
    </div>
  );
}
