# =============================================================================
# Rasid Platform v6 — Dockerfile
# Constitutional Reference: DCD-004 (pinned versions), DCD-005 (deterministic)
# Multi-stage build for production optimization
# =============================================================================

# Stage 1: Build
FROM node:20.11-alpine AS builder
WORKDIR /app

# Copy dependency files first (cache optimization)
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy source
COPY tsconfig.json nest-cli.json ./
COPY src/ ./src/
COPY kernel/ ./kernel/
COPY shared/ ./shared/
COPY config/ ./config/

# Build
RUN npm run build

# Stage 2: Production
FROM node:20.11-alpine AS production
WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 rasid && adduser -u 1001 -G rasid -s /bin/sh -D rasid

# Copy production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R rasid:rasid /app

USER rasid

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/config/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

EXPOSE 3000

CMD ["node", "dist/src/main"]
