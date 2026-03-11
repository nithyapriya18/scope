import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // PetaSight Brand Colors
        'ps-primary': {
          DEFAULT: '#da365c', // Magenta (main brand color)
          50: '#fef2f3',
          100: '#fde6e8',
          200: '#fbd0d5',
          300: '#f7aab3',
          400: '#f17a8a',
          500: '#e65170',
          600: '#da365c', // Main
          700: '#b52548',
          800: '#981f3f',
          900: '#821d3a',
        },
        'ps-secondary': {
          DEFAULT: '#1e40af', // Blue-800
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93bbfd',
          400: '#609dfa',
          500: '#3b7ef6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af', // Main
          900: '#1e3a8a',
        },
        'ps-accent': {
          DEFAULT: '#34d399', // Emerald-400
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399', // Main
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Semantic colors for easy theming
        primary: {
          DEFAULT: '#da365c',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#1e40af',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#34d399',
          foreground: '#000000',
        },
        background: '#ffffff',
        foreground: '#0f172a',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#0f172a',
        },
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#da365c',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};

export default config;
