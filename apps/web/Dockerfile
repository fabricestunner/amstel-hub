# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --filter @amstel/web... --frozen-lockfile || pnpm install --filter @amstel/web...

COPY apps/web ./apps/web
RUN pnpm --filter @amstel/web build

# ── Runtime stage (Next.js standalone) ───────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
