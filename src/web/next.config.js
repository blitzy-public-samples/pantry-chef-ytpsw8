// @ts-check

// External dependency: Bundle analyzer version ^13.0.0
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});

// Import API configuration constants
const { BASE_URL } = require('./src/config/constants');

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

    // Add custom webpack rules
    config.module.rules.push(
      // TypeScript/JavaScript processing
      {
        test: /\.(ts|js)x?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['next/babel']
          }
        }
      },
      // CSS/SASS processing
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      }
    );

    return config;
  },

  // Enable TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false
  }
};

// Export configuration with bundle analyzer wrapper
module.exports = withBundleAnalyzer(nextConfig);