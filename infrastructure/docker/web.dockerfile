# HUMAN TASKS:
# 1. Configure SSL certificates and ensure they are mounted correctly
# 2. Set up environment-specific API_URL and WS_URL values
# 3. Configure CloudFront distribution for static assets
# 4. Review and adjust nginx worker processes based on host resources
# 5. Set up monitoring and logging aggregation
# 6. Configure custom domain and DNS settings

# Stage 1: Builder
# Requirement: Frontend Stack - Build stage for Next.js application
FROM node:16-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
# Requirement: Frontend Stack - Install necessary build tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    build-base

# Copy package files
COPY src/web/package*.json ./

# Install dependencies with exact versions for reproducible builds
# Requirement: Frontend Stack - Install dependencies
RUN npm ci

# Copy source code
COPY src/web .

# Set production environment
# Requirement: Deployment Architecture - Production configuration
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Build application
# Requirement: Frontend Stack - Build Next.js application
RUN npm run build && \
    npm run export && \
    # Clean development dependencies
    rm -rf node_modules && \
    npm ci --only=production

# Stage 2: Production
# Requirement: Deployment Architecture - Production-ready Nginx configuration
FROM nginx:alpine

# Copy custom nginx configuration
# Requirement: Security Architecture - Nginx security configuration
COPY infrastructure/docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY infrastructure/docker/nginx/security-headers.conf /etc/nginx/security-headers.conf

# Copy built application from builder stage
COPY --from=builder /app/out /usr/share/nginx/html

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Set correct permissions
# Requirement: Security Architecture - File permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 644 /usr/share/nginx/html && \
    find /usr/share/nginx/html -type d -exec chmod 755 {} \;

# Configure non-root user
# Requirement: Security Architecture - Non-root user configuration
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx && \
    # Create required directories with correct permissions
    mkdir -p /var/cache/nginx /var/run && \
    chown -R nginx:nginx /var/cache/nginx /var/run && \
    chmod -R 755 /var/cache/nginx /var/run

# Compress static assets
# Requirement: Frontend Stack - Static asset optimization
RUN find /usr/share/nginx/html -type f -regex ".*\.\(js\|css\|html\|xml\|json\|txt\|ico\)$" -exec gzip -9 -k {} \; && \
    find /usr/share/nginx/html -type f -regex ".*\.\(js\|css\|html\|xml\|json\|txt\|ico\)$" -exec brotli -9 -k {} \;

# Expose HTTP port
# Requirement: Deployment Architecture - Port configuration
EXPOSE 80

# Add health check
# Requirement: Deployment Architecture - Container health monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl --fail http://localhost:80/health || exit 1

# Set security options
# Requirement: Security Architecture - Container security hardening
USER nginx
WORKDIR /usr/share/nginx/html

# Set environment variables
# Requirement: Deployment Architecture - Runtime configuration
ENV NEXT_PUBLIC_API_URL=${API_URL} \
    NEXT_PUBLIC_WS_URL=${WS_URL}

# Start Nginx
# Requirement: Deployment Architecture - Process management
CMD ["nginx", "-g", "daemon off;"]

# Security labels
# Requirement: Security Architecture - Container security labels
LABEL security.capabilities="NET_BIND_SERVICE" \
      security.read_only_root_filesystem="true" \
      security.no_new_privileges="true" \
      security.seccomp="unconfined"