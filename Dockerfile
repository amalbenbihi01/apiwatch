# ==========================================
# STAGE 1: Dependencies
# ==========================================
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm install

# ==========================================
# STAGE 2: Builder
# ==========================================
FROM node:24-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client & Build Next.js in standalone mode
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ==========================================
# STAGE 3: Production Runner
# ==========================================
FROM node:24-alpine AS runner
RUN apk add --no-cache libc6-compat openssl curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1
ENV PATH="/app/node_modules/.bin:${PATH}"

# Security: Create non-root system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and public directory
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy Next.js standalone server bundle
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy Prisma schema, migrations, package.json and full node_modules from deps stage
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=deps --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy and setup entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN dos2unix ./docker-entrypoint.sh 2>/dev/null || true
RUN chmod +x ./docker-entrypoint.sh && chown nextjs:nodejs ./docker-entrypoint.sh

# Switch to non-root user
USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
