// @ts-check
// Tailwind CSS v3.0.0

/**
 * HUMAN TASKS:
 * 1. Ensure Tailwind CSS is properly installed and configured in the project
 * 2. Verify that the theme configuration is imported in tailwind.config.js
 * 3. Update Inter font family in the project if not already included
 */

/**
 * Global theme configuration for the PantryChef web dashboard
 * Implements requirements:
 * - Frontend UI Framework: Material Design implementation with React Native Paper
 * - Web Dashboard: Responsive design system with consistent styling
 */

export const palette = {
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
    900: '#0c4a6e',
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
    900: '#0f172a',
  },
  error: {
    main: '#dc2626',
    light: '#ef4444',
    dark: '#b91c1c',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
  },
  success: {
    main: '#16a34a',
    light: '#22c55e',
    dark: '#15803d',
  },
  background: {
    default: '#ffffff',
    paper: '#f8fafc',
    dark: '#0f172a',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    disabled: '#94a3b8',
  },
};

export const chartColors = {
  mediumBlue: palette.primary[600],
  brightGreen: palette.success.main,
  mutedBlueGrey: palette.text.disabled,
  darkerBlue: palette.primary[700],
  boldRed: palette.error.main,
  vibrantAmber: palette.warning.main,
  darkSlate: palette.secondary[800],
  softGreyBlue: palette.secondary[500],
  lightBlue: palette.primary[100],
  softGrey: palette.background.dark,
}

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'].join(','),
    serif: ['Georgia', 'serif'],
    mono: ['Menlo', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
};

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  12: '3rem',
  16: '4rem',
};

export const breakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
};

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  full: '9999px',
};

// Export theme object for use with Tailwind CSS and React Native Paper
export const theme = {
  palette,
  typography,
  spacing,
  breakpoints,
  shadows,
  borderRadius,
  chartColors,
};

export default theme;