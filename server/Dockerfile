# ==============================================================================
# CONFIGURATION & GLOBAL ARGS
# ==============================================================================
ARG NODE_VERSION=22-bookworm-slim

# ==============================================================================
# STAGE 1: PRODUCTION DEPENDENCIES (deps-prod)
# ==============================================================================
FROM node:${NODE_VERSION} AS deps-prod

WORKDIR /app

# Cache dependency layer
COPY package*.json ./

# Install only production dependencies using BuildKit locked cache
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --omit=dev

# ==============================================================================
# STAGE 2: BUILDER & COMPILATION (builder)
# Debian Bookworm-Slim đã tích hợp sẵn ca-certificates & libssl3 (phù hợp Prisma 6)
# Không cần apt-get install openssl/ca-certificates giúp tăng tốc và ổn định build.
# ==============================================================================
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# Install all dependencies (including devDependencies) with BuildKit cache
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

# Copy Prisma configuration and schemas only (cô lập layer, tránh bust cache bởi migrations/scripts)
COPY prisma.config.ts ./
COPY prisma/schema ./prisma/schema/
RUN npx prisma generate

# Copy application source code and compile NestJS
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/
RUN npx nest build

# ==============================================================================
# STAGE 3: PRODUCTION RUNNER (runner)
# ==============================================================================
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

# Runtime environment settings
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--experimental-require-module"

# Install tini for robust PID 1 signal forwarding and zombie process reaping
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Security Hardening: Tạo thư mục uploads với quyền sở hữu của user node
RUN mkdir -p /app/uploads/chat /app/uploads/avatars && \
    chown -R node:node /app/uploads && \
    chmod -R 775 /app/uploads

# Copy production node_modules from deps-prod stage (read-only for node)
COPY --from=deps-prod /app/node_modules ./node_modules

# Copy Prisma generated client and engines from builder stage (read-only for node)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy package manifests and schemas for operational introspection (read-only)
COPY package*.json prisma.config.ts ./
COPY --from=builder /app/prisma/schema ./prisma/schema/

# Copy compiled JavaScript from builder stage (read-only for node)
COPY --from=builder /app/dist ./dist

# Switch to unprivileged user
USER node

EXPOSE 3000

# Healthcheck probe using built-in Node native fetch pointing to liveness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health/live').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Entrypoint manages signals (SIGTERM/SIGINT) and zombie processes (-s for subreaper)
ENTRYPOINT ["tini", "-s", "--"]

# Start application with Node V8 memory constraint for 4GB VPS (container memory 512MB)
CMD ["node", "--max-old-space-size=384", "dist/main.js"]


