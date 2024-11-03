// @ts-check

/**
 * HUMAN TASKS:
 * 1. Ensure Google Fonts (Inter) is properly configured in the project
 * 2. Verify that theme configuration is correctly imported
 * 3. Check that all meta tags are properly set for SEO optimization
 */

import Document, { Html, Head, Main, NextScript } from 'next/document'; // next/document ^13.0.0
import { palette, typography } from '../config/theme';

/**
 * Custom Document component that extends Next.js Document to customize the HTML structure
 * with Material Design theming and responsive meta tags.
 * 
 * Implements requirements:
 * - Web Dashboard: Responsive design with consistent styling across the application
 * - Frontend UI Framework: Material Design implementation with proper theming
 */
class CustomDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Character encoding */}
          <meta charSet="utf-8" />
          
          {/* Responsive viewport configuration */}
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          
          {/* Preload Inter font for optimal performance */}
          <link
            rel="preconnect"
            href="https://fonts.googleapis.com"
          />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
          
          {/* Material Design theme color */}
          <meta
            name="theme-color"
            content={palette.primary[500]}
          />
          
          {/* PWA capable */}
          <meta
            name="mobile-web-app-capable"
            content="yes"
          />
          <meta
            name="apple-mobile-web-app-capable"
            content="yes"
          />
        </Head>
        <body
          style={{
            margin: 0,
            padding: 0,
            backgroundColor: palette.background.default,
            color: palette.text.primary,
            fontFamily: typography.fontFamily.sans.join(', '),
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.normal,
            lineHeight: typography.lineHeight.normal,
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          }}
        >
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default CustomDocument;