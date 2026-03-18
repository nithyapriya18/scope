'use client';

import Link from 'next/link';
import { Menu, X, LogOut, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getCurrentUser, logout } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import Image from 'next/image';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const isLandingPage = pathname === '/';

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/petasight.png"
              alt="PetaSight"
              width={26}
              height={26}
              className="object-contain"
              priority
              unoptimized
            />
            <div className="flex flex-col leading-tight">
              <span className="text-sm tracking-widest text-gray-900 dark:text-white">
                <span className="font-normal">PETA</span>
                <span className="font-bold">SIGHT</span>
              </span>
              <span className="text-xs font-bold tracking-wide text-gray-900 dark:text-white">
                Lumina Scope
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {isLandingPage && (
              <>
                <a
                  href="#features"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Features
                </a>
                <a
                  href="#contact"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Contact
                </a>
              </>
            )}
            {user && !isLandingPage && (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Home
                </Link>
              </>
            )}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {isLandingPage && (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-ps-primary-600 hover:bg-ps-primary-50 dark:hover:bg-ps-primary-950 rounded-lg text-sm font-medium transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/login"
                  className="px-4 py-2 bg-ps-primary-600 hover:bg-ps-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
            {isLandingPage ? (
              <>
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mx-2 mb-1"
                >
                  Features
                </a>
                <a
                  href="#contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mx-2 mb-1"
                >
                  Contact
                </a>
                <div className="flex gap-2 px-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-ps-primary-600 border border-ps-primary-600 hover:bg-ps-primary-50 dark:hover:bg-ps-primary-950 rounded-lg text-center"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-ps-primary-600 hover:bg-ps-primary-700 rounded-lg text-center"
                  >
                    Sign Up
                  </Link>
                </div>
              </>
            ) : user ? (
              <>
                <div className="px-4 py-2 mb-2 border-b border-gray-100 dark:border-gray-700">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</div>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mx-2 mb-1"
                >
                  Home
                </Link>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 mt-2 border-t border-gray-100 dark:border-gray-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm font-medium text-ps-primary-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg mx-2"
              >
                Log In
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
