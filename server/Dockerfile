# ==============================================================================
# STAGE 1: BUILDER
# ==============================================================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install CA certificates and OpenSSL for Prisma engine build
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Cache dependency layers
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy configuration and source code
COPY tsconfig*.json nest-cli.json ./
COPY src ./src/

# Generate Prisma Client
RUN npx prisma generate

# Compile TypeScript / NestJS
RUN npm run build:docker

# ==============================================================================
# STAGE 2: PRODUCTION RUNNER
# ==============================================================================
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install curl for healthcheck probe
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Runtime environment settings
ENV NODE_ENV=production
ENV PORT=3000

# Create application and upload directories with node user ownership
RUN mkdir -p /app/uploads/chat /app/uploads/avatars && \
    chown -R node:node /app

# Copy package manifests and Prisma schemas
COPY --chown=node:node package*.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Generate Prisma Client in production node_modules
RUN npx prisma generate

# Copy compiled JavaScript from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist

# Switch to non-root user
USER node

EXPOSE 3000

# Healthcheck probe using built-in /health/ready endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/health/ready || exit 1

# Start application with Node V8 memory constraint for 4GB VPS
CMD ["node", "--max-old-space-size=384", "dist/main.js"]
