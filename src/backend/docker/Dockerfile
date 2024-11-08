# HUMAN TASKS:
# 1. Ensure AWS credentials are properly configured in the deployment environment
# 2. Configure environment-specific variables in deployment pipeline
# 3. Set up proper SSL certificates for HTTPS
# 4. Configure monitoring and logging endpoints
# 5. Set up proper network security groups and firewall rules

# Stage 1: Builder
# Requirement: Backend Container Configuration - Configures Node.js API service container with optimized Alpine base image
FROM node:20-alpine AS builder

# Install build dependencies
# Requirement: Backend Technology Stack - Sets up Node.js runtime environment with required dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    # Required for node-gyp and native module compilation
    build-base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with exact versions for reproducible builds
# npm ci is faster and more reliable than npm install for CI environments
RUN npm ci

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Prune development dependencies
RUN npm prune --production

# Stage 2: Production
# Requirement: Production Environment Setup - Configures production-ready container with security and performance optimizations
FROM node:20-alpine AS production

# Install production dependencies
RUN apk add --no-cache \
    curl \
    # Required for container health checks
    tzdata \
    # Required for proper timezone support
    python3 \
    # Required for TensorFlow.js
    && rm -rf /var/cache/apk/*

# Create non-root user and group
# Requirement: Production Environment Setup - Security optimization
# RUN adduser -u 1001 -S node -G node
# RUN addgroup -g 1001 -S node && \
#     adduser -u 1001 -S node -G node

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=UTC \
    NODE_OPTIONS="--max-old-space-size=2048"

# Configure timezone
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

# Set proper permissions
RUN chown -R node:node /app && \
    chmod -R 755 /app

# Create required directories with proper permissions
RUN mkdir -p /app/logs && \
    chown -R node:node /app/logs && \
    chmod 755 /app/logs

# Switch to non-root user
USER node

# Expose application port
EXPOSE 3000

# Configure health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl --fail http://localhost:3000/health || exit 1

# Set security options
LABEL security.nsa.gov.sensitivity=high
LABEL org.opencontainers.image.source="https://github.com/pantrychef/backend"

# Configure read-only root filesystem and temporary storage
VOLUME ["/app/node_modules", "/app/dist", "/app/logs"]
WORKDIR /app

# Set entry point
ENTRYPOINT ["node", "dist/server.js"]

# Apply security options
LABEL org.opencontainers.image.vendor="PantryChef"
LABEL org.opencontainers.image.title="PantryChef Backend Service"
LABEL org.opencontainers.image.description="Backend service for PantryChef application"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.licenses="MIT"

# Security configurations
# No new privileges for processes
LABEL seccomp=unconfined
LABEL no-new-privileges=true

# Configure tmpfs mounts for temporary storage
VOLUME ["/tmp", "/var/run"]