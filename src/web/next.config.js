// @ts-check

// External dependency: Bundle analyzer version ^13.0.0
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

// API base URL for the `env` block below. This file is plain CommonJS executed
// by Node during `next build`/`next dev`, so it CANNOT `require('./src/config/constants')`
// (a TypeScript module Node cannot load) — doing so threw at config evaluation and
// prevented the dev/build server from booting. We instead read the same env var the
// TS `API_CONFIG.BASE_URL` reads, with the identical localhost fallback, so behavior
// is unchanged.
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * HUMAN TASKS:
 * 1. Configure CloudFront distribution and update NEXT_PUBLIC_CLOUDFRONT_DOMAIN
 * 2. Set up SSL certificates for custom domains
 * 3. Configure Google Analytics by setting NEXT_PUBLIC_GA_ID
 * 4. Set up Sentry error tracking and add NEXT_PUBLIC_SENTRY_DSN
 * 5. Configure WebSocket endpoints in NEXT_PUBLIC_WS_URL
 */

// Requirement: Frontend Stack - Next.js configuration with optimization settings
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Requirement: CDN Configuration - Asset optimization and CloudFront setup
  images: {
    domains: [
      'storage.googleapis.com',
      'cdn.pantrychef.com',
      '*.cloudfront.net'
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    formats: ['image/webp']
  },

  // Requirement: Security Protocols - Security headers and CSP configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; " +
                   "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
                   "style-src 'self' 'unsafe-inline'; " +
                   "img-src 'self' data: https://*.pantrychef.com https://*.amazonaws.com; " +
                   "font-src 'self'; " +
                   "connect-src 'self' https://*.pantrychef.com wss://*.pantrychef.com"
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  },

  // Environment variables configuration
  env: {
    NEXT_PUBLIC_API_URL: BASE_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN
  },

  // Requirement: Frontend Stack - Webpack configuration with optimizations
  webpack: (config, { dev, isServer }) => {
    // Enable code splitting
    config.optimization.splitChunks = {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    };

    // Enable production optimizations
    if (!dev) {
      config.optimization.minimize = true;
    }

    // NOTE: previously this pushed two custom module rules that broke every build:
    //   (1) a `babel-loader` rule for ts/js — `babel-loader` is not installed AND it
    //       duplicated/overrode Next 13's built-in SWC transpilation, 500-ing every page;
    //   (2) a `style-loader/css-loader/sass-loader` rule for `.scss` that DISABLED Next's
    //       built-in CSS pipeline, so `src/styles/globals.css` (which uses `@tailwind`
    //       directives handled by postcss.config.js + tailwind.config.js) failed with
    //       "Unexpected character '@'", 500-ing every page.
    // Both are removed: Next 13's built-in SWC + PostCSS/Tailwind pipeline already handles
    // TS/JS and CSS (including SCSS) natively. The splitChunks/minimize tuning above is kept.

    return config;
  },

  // Enable TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false
  }
};

// Export configuration with bundle analyzer wrapper
module.exports = withBundleAnalyzer(nextConfig);