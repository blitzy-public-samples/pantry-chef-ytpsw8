/** @type {import('tailwindcss').Config} */

// Tailwind CSS v3.3.0
// @tailwindcss/forms v0.5.0
// @tailwindcss/typography v0.5.0
// @tailwindcss/aspect-ratio v0.4.0

/* HUMAN TASKS:
1. Ensure Tailwind CSS v3.3.0 is installed
2. Install @tailwindcss/forms v0.5.0 plugin
3. Install @tailwindcss/typography v0.5.0 plugin
4. Install @tailwindcss/aspect-ratio v0.4.0 plugin
5. Verify Inter font is properly imported in the project
6. Configure dark mode settings in your application */

module.exports = {
  // Requirement: Frontend UI Framework - Scan all React components for Tailwind classes
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}'
  ],

  // Requirement: Mobile-first Design - Enable dark mode using class strategy
  darkMode: 'class',

  // Requirement: Frontend UI Framework with Material Design implementation
  theme: {
    extend: {
      // Color palette following Material Design principles
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e'
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a'
        },
        error: {
          main: '#dc2626',
          light: '#ef4444',
          dark: '#b91c1c'
        },
        warning: {
          main: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706'
        },
        success: {
          main: '#16a34a',
          light: '#22c55e',
          dark: '#15803d'
        }
      },

      // Typography system with Inter font
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        mono: ['Menlo', 'monospace']
      },

      // Font size scale
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem'
      },

      // Layout spacing for navigation elements
      spacing: {
        'navbar': '64px',
        'sidebar': '250px'
      },

      // Responsive breakpoints following Material Design grid system
      screens: {
        'xs': '0px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px'
      },

      // Material Design elevation system using box shadows
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)'
      },

      // Border radius following Material Design specs
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'full': '9999px'
      }
    }
  },

  // Requirement: Frontend UI Framework - Essential Tailwind plugins
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio')
  ]
};