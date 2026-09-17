# ==============================================================================
# STAGE 1: PRODUCTION DEPENDENCIES (deps-prod)
# ==============================================================================
FROM node:20-bookworm-slim AS deps-prod

WORKDIR /app

# Cache dependency layer
COPY package*.json ./

# Install only production dependencies with BuildKit locked cache
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --omit=dev

# ==============================================================================
# STAGE 2: BUILDER & COMPILATION (builder)
# ==============================================================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install CA certificates & OpenSSL required by Prisma CLI and schema engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Install all dependencies (including devDependencies) with BuildKit locked cache
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

# Copy Prisma schema and generate client (isolated layer)
COPY prisma.config.ts ./
COPY prisma ./prisma/
RUN npx prisma generate

# Copy application source code and compile NestJS
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/
RUN npx nest build

# ==============================================================================
# STAGE 3: PRODUCTION RUNNER (runner)
# ==============================================================================
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Runtime environment settings
ENV NODE_ENV=production
ENV PORT=3000

# Create application and upload directories with node user ownership
RUN mkdir -p /app/uploads/chat /app/uploads/avatars && \
    chown -R node:node /app

# Copy production node_modules from deps-prod stage
COPY --from=deps-prod --chown=node:node /app/node_modules ./node_modules

# Copy Prisma generated client and engines from builder stage
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy package manifests and schemas for operational convenience
COPY --chown=node:node package*.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma/

# Copy compiled JavaScript from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist

# Switch to non-root user
USER node

EXPOSE 3000

# Healthcheck probe using built-in Node native fetch (zero curl dependency)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start application with Node V8 memory constraint for 4GB VPS
CMD ["node", "--max-old-space-size=384", "dist/main.js"]
