'use client';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Copyright */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            © 2026 <span className="font-semibold text-gray-900 dark:text-white">PetaSight Inc</span>.
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="https://www.petasight.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="https://www.petasight.com/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
