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
        // PetaSight Brand Colors (from Figma Design System)
        'ps-primary': {
          DEFAULT: '#DA365C', // Primary brand color
          50: '#FDEBEE',
          100: '#F9C7D3',
          200: '#F49FB1',
          300: '#EE6E8A',
          400: '#E24E72',
          500: '#DA365C', // Main
          600: '#C12E52',
          700: '#8F2443',
          800: '#7E1B35',
          900: '#5B1226',
        },
        'ps-secondary': {
          DEFAULT: '#4F73CD', // Secondary brand color
          50: '#E9EFFB',
          100: '#CCD8F5',
          200: '#CCD8F5',
          300: '#CCD8F5',
          400: '#6386D9',
          500: '#4F73CD', // Main
          600: '#3F5FB2',
          700: '#3F5FB2',
          800: '#3F5FB2',
          900: '#3F5FB2',
        },
        // Status/Alerts Colors
        success: {
          DEFAULT: '#16A34A',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#F59E0B',
          foreground: '#000000',
        },
        error: {
          DEFAULT: '#DA365C', // Using primary as focus/error
          foreground: '#ffffff',
        },
        info: {
          DEFAULT: '#02B4C7',
          foreground: '#ffffff',
        },
        // Neutral Colors (Grays)
        neutral: {
          0: '#FFFFFF',
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#0B0F19',
        },
        // Semantic colors for easy theming
        primary: {
          DEFAULT: '#DA365C',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#4F73CD',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#16A34A',
          foreground: '#FFFFFF',
        },
        // Background colors
        background: {
          DEFAULT: '#FFFFFF', // Primary background
          secondary: '#F9FAFB', // Secondary background
          surface: '#F3F4F6', // Surface
          elevated: '#FFFFFF', // Elevated
        },
        // Text colors
        foreground: {
          DEFAULT: '#111827', // Text Primary
          secondary: '#4B5563', // Text Secondary
          tertiary: '#6B7280', // Text Tertiary
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#111827',
        },
        border: '#E5E7EB', // Neutral-200
        input: '#E5E7EB',
        ring: '#DA365C', // Primary
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Typography from Figma Design System
        'heading-1': ['64px', { lineHeight: '140%', fontWeight: '700' }], // Bold 64px/140%
        'heading-2': ['48px', { lineHeight: '140%', fontWeight: '600' }], // Semi Bold 48px/140%
        'heading-3': ['36px', { lineHeight: '140%', fontWeight: '600' }], // Semi Bold 36px/140%
        'subtitle': ['18px', { lineHeight: '140%', fontWeight: '700' }], // Bold 18px/140%
        'paragraph': ['16px', { lineHeight: '140%', fontWeight: '400' }], // Regular 16px/140%
        'button-lg': ['18px', { lineHeight: '140%', fontWeight: '500' }], // Medium 18px/140%
        'button': ['16px', { lineHeight: '140%', fontWeight: '500' }], // Medium 16px/140%
        'button-sm': ['14px', { lineHeight: '140%', fontWeight: '400' }], // Regular 14px/140%
      },
      borderRadius: {
        none: '0',
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
