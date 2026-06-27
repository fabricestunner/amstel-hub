# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

# Install deps first (cache layer)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

RUN pnpm --filter @amstel/api db:generate \
 && pnpm --filter @amstel/api build

# pnpm deploy produces a self-contained dir with real files (no symlinks)
RUN pnpm --filter @amstel/api deploy --prod /prod/api

# ── Runtime stage ────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Self-contained production node_modules from pnpm deploy
COPY --from=builder /prod/api/node_modules ./node_modules
# Built output + Prisma schema (for migrate deploy on startup)
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
