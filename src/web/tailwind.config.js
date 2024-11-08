/** @type {import('tailwindcss').Config} */
import { theme, typography } from './src/config/theme';

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
    './src/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}'
  ],

  // Requirement: Mobile-first Design - Enable dark mode using class strategy
  darkMode: 'class',
  mode: 'jit',
  // Requirement: Frontend UI Framework with Material Design implementation
  theme: {
    extend: {
      // Color palette following Material Design principles
      colors: theme.palette,

      // Typography system with Inter font
      fontFamily: theme.typography.fontFamily,

      // Font size scale
      fontSize: theme.typography.fontSize,

      // Font weight
      fontWeight: typography.fontWeight,

      // Layout spacing for navigation elements
      spacing: {
        'navbar': '64px',
        'sidebar': '250px',
        ...theme.spacing,
      },

      // Responsive breakpoints following Material Design grid system
      screens: theme.breakpoints,

      // Material Design elevation system using box shadows
      boxShadow: theme.shadows,

      // Border radius following Material Design specs
      borderRadius: theme.borderRadius
    }
  },

  // Requirement: Frontend UI Framework - Essential Tailwind plugins
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio')
  ]
};