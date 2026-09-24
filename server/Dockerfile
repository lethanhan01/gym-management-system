# ==============================================================================
# CONFIGURATION & GLOBAL ARGS
# ==============================================================================
ARG NODE_VERSION=22-bookworm-slim

# ==============================================================================
# STAGE 1: BUILDER & COMPILATION (builder)
# ==============================================================================
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# Install OpenSSL & CA certificates for reliable Prisma Query Engine detection
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Cache dependency layer for full installation
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

# Generate Prisma Client & native query engine
COPY prisma.config.ts ./
COPY prisma/schema ./prisma/schema/
RUN npx prisma generate

# Compile TypeScript source code to JavaScript in dist/
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/
RUN npx nest build

# ==============================================================================
# STAGE 2: PRODUCTION DEPENDENCIES BUNDLE (deps-prod)
# ==============================================================================
FROM node:${NODE_VERSION} AS deps-prod

WORKDIR /app

# Install ONLY production dependencies using locked npm cache
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --omit=dev --ignore-scripts

# Import the generated Prisma client & query engine directly into node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Safe static cleanup: eliminate sourcemaps, markdown, and documentation files to save ~30MB
RUN find node_modules -type f \( -name "*.map" -o -name "*.d.ts.map" -o -name "*.md" -o -name "CHANGELOG*" -o -name "README*" -o -name "LICENSE*" \) -delete && \
    find node_modules -type d \( -name ".github" -o -name "docs" \) -exec rm -rf {} + 2>/dev/null || true

# ==============================================================================
# STAGE 3: PRODUCTION RUNNER (runner)
# ==============================================================================
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

# Runtime environment settings
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--experimental-require-module"

# Install tini & openssl with complete apt cache cleanup
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Security Hardening: Prepare upload folders with unprivileged node user ownership
RUN mkdir -p /app/uploads/chat /app/uploads/avatars && \
    chown -R node:node /app/uploads && \
    chmod -R 775 /app/uploads

# CRITICAL OPTIMIZATION: Exactly ONE COPY for node_modules (0 duplicate layers)
COPY --from=deps-prod /app/node_modules ./node_modules

# Copy application manifests & Prisma schema (required for Prisma 6 multi-file runtime)
COPY package*.json prisma.config.ts ./
COPY --from=builder /app/prisma/schema ./prisma/schema/

# Copy compiled JavaScript output
COPY --from=builder /app/dist ./dist

# Switch to unprivileged user
USER node

EXPOSE 3000

# Healthcheck probe using Node native fetch pointing to liveness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health/live').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Process supervisor entrypoint
ENTRYPOINT ["tini", "-s", "--"]

# Start application with Node V8 memory constraint for 4GB VPS (container memory 512MB)
CMD ["node", "--max-old-space-size=384", "dist/main.js"]
