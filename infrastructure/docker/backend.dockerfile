# HUMAN TASKS:
# 1. Ensure MongoDB, Redis, Elasticsearch, and RabbitMQ services are running and accessible
# 2. Configure environment-specific variables in deployment pipeline
# 3. Set up appropriate security groups and network access rules
# 4. Configure monitoring and logging aggregation
# 5. Set up SSL certificates for secure communication

# Stage 1: Builder
# Requirement: Backend Container Configuration - Configures Node.js API service container with optimized Alpine base image
FROM node:16-alpine AS builder

# Install build dependencies
# Requirement: Backend Technology Stack - Sets up Node.js runtime environment with required dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    # Required for native module compilation
    alpine-sdk

# Set working directory
WORKDIR /app

# Copy package files
COPY src/backend/package*.json ./

# Install dependencies including native modules
# Requirement: Backend Technology Stack - Sets up Node.js runtime environment with required dependencies
RUN npm ci

# Copy source code and TypeScript configuration
COPY src/backend/tsconfig.json ./
COPY src/backend/src ./src

# Build TypeScript files
RUN npm run build

# Prune development dependencies
RUN npm prune --production

# Stage 2: Production
# Requirement: Production Environment Setup - Configures production-ready container environment
FROM node:16-alpine

# Install production dependencies
RUN apk add --no-cache \
    python3 \
    # Required for health check
    curl

# Create app directory
WORKDIR /app

# Set up non-root user for security
# Requirement: Security Implementation - Implements container security best practices
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Configure environment variables
# Requirement: Production Environment Setup - Sets up production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=UTC \
    MONGODB_URI=mongodb://mongodb:27017/pantrychef \
    REDIS_URL=redis://redis:6379 \
    ELASTICSEARCH_URL=http://elasticsearch:9200 \
    RABBITMQ_URL=amqp://rabbitmq:5672

# Create necessary directories with appropriate permissions
# Requirement: Security Implementation - Implements security hardening measures
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app/logs /app/uploads && \
    chmod 755 /app/logs /app/uploads

# Switch to non-root user
USER nodejs:nodejs

# Expose API port
EXPOSE 3000

# Set up health check
# Requirement: Production Environment Setup - Implements health monitoring
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl --fail http://localhost:3000/health || exit 1

# Set security options
# Requirement: Security Implementation - Implements container security best practices
LABEL maintainer="PantryChef DevOps" \
      description="PantryChef Backend Service" \
      version="1.0"

# Drop capabilities for security hardening
# Requirement: Security Implementation - Implements security hardening measures
SECURITY_OPTS="no-new-privileges:true"
CAPABILITIES="--cap-drop=ALL"

# Define entry point
CMD ["node", "dist/server.js"]