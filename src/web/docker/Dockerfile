# HUMAN TASKS:
# 1. Configure CloudFront distribution and set NEXT_PUBLIC_CLOUDFRONT_DOMAIN in environment
# 2. Set up Google Analytics and configure NEXT_PUBLIC_GA_ID
# 3. Configure Sentry error tracking and set NEXT_PUBLIC_SENTRY_DSN
# 4. Set up WebSocket endpoints and configure NEXT_PUBLIC_WS_URL
# 5. Review security settings and adjust capabilities if needed
# 6. Configure SSL certificates for domains
# 7. Set up health check monitoring alerts

# Requirement: Frontend Stack - Node.js and Next.js based web application containerization
# Base image: node:16-alpine (version specified in package.json engines)
FROM node:16-alpine AS builder

# Set working directory
WORKDIR /app

# Requirement: Containerization - Dependency caching optimization
# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

# Copy configuration files
COPY next.config.js tsconfig.json ./
COPY public ./public
COPY src ./src

# Set build environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Build arguments for runtime configuration
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_CLOUDFRONT_DOMAIN

# Set build-time environment variables
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL} \
    NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID} \
    NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN} \
    NEXT_PUBLIC_CLOUDFRONT_DOMAIN=${NEXT_PUBLIC_CLOUDFRONT_DOMAIN}

# Requirement: Frontend Stack - Production build with bundle analysis
RUN npm run analyze

# Remove development dependencies to reduce image size
RUN npm prune --production

# Requirement: Containerization - Multi-stage build for production
FROM node:16-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files for production dependencies
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY next.config.js ./

# Set production environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Runtime environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

# Requirement: Security Architecture - Container security hardening
# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Configure health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Expose Next.js server port
EXPOSE 3000

# Set container security options
LABEL security.capabilities.drop="ALL"
LABEL security.read_only="true"
LABEL security.no_new_privileges="true"

# Start Next.js production server
CMD ["npm", "start"]

# Apply security hardening
# Drop all capabilities and run with read-only filesystem
VOLUME ["/app/node_modules", "/app/.next"]
USER 1001
ENTRYPOINT ["npm", "start"]