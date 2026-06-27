# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --filter @amstel/api... --frozen-lockfile || pnpm install --filter @amstel/api...

COPY apps/api ./apps/api
RUN pnpm --filter @amstel/api db:generate \
    && pnpm --filter @amstel/api build

# ── Runtime stage ────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 4000
CMD ["node", "dist/main.js"]
