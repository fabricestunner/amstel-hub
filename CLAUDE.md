# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Enterprise loyalty & rewards platform for a nationwide brewery campaign. Customers earn points by redeeming encrypted promo/QR/bottle codes, spend points on rewards and tournament entries, and compete on national leaderboards. Role-scoped dashboards serve admins, outlet managers, and customers.

## Monorepo structure

pnpm workspaces + Turborepo. Three packages:

- `apps/api` — NestJS 10 backend, port 4000
- `apps/web` — Next.js 15 (App Router) frontend, port 3000
- `packages/shared` — Zod schemas and TypeScript types shared between both apps (consumed directly from source, no build step)

## Commands

```bash
# One-time setup
cp .env.example .env
pnpm docker:up                          # Postgres + Redis + MinIO + Mailpit
pnpm install
pnpm db:generate && pnpm db:migrate && pnpm db:seed

# Development
pnpm dev                                # api :4000 + web :3000 concurrently
pnpm build                             # build all apps
pnpm lint                              # ESLint across all apps
pnpm typecheck                         # tsc --noEmit across all apps
pnpm format                            # Prettier

# Database (delegates to apps/api)
pnpm db:generate                       # prisma generate
pnpm db:migrate                        # prisma migrate dev
pnpm db:seed                           # ts-node prisma/seed.ts
pnpm db:studio                         # Prisma Studio

# Testing (run from root or filter to app)
pnpm test                              # all tests
pnpm --filter @amstel/api test -- --testPathPattern=loyalty   # single test file
pnpm --filter @amstel/api test:watch   # watch mode
pnpm --filter @amstel/api test:cov     # coverage

# Docker
pnpm docker:up / pnpm docker:down
```

Seeded admin: `admin@amstel.com` / `Password123!`

Swagger UI: `http://localhost:4000/docs`

## API architecture (`apps/api`)

**Global guards** (applied to every route in this order):
1. `ThrottlerGuard` — rate limiting
2. `JwtAuthGuard` — JWT validation; all routes protected by default
3. `RolesGuard` — RBAC enforcement

To make a route public, apply `@Public()` decorator (from `src/common/decorators`).

**Response envelope** — `TransformInterceptor` wraps every successful response as `{ success: true, data: ... }`. Errors go through `HttpExceptionFilter` as `{ success: false, message, errors }`.

**Modules** (`src/modules/`): `auth`, `users`, `loyalty`, `campaigns`, `outlets`, `rewards`, `tournaments`, `leaderboards`, `analytics`, `notifications`, `health`.

**Common infrastructure** (`src/common/`):
- `PrismaModule` / `RedisModule` — global singletons
- `CryptoService` — AES-256-GCM encryption + SHA-256 hashing for loyalty codes
- `PaginationQueryDto` / `paginate()` — standardized cursor-free pagination

**Configuration** — all env vars typed and centralized in `src/config/configuration.ts` (`AppConfig` interface). Access via `ConfigService.get<T>('nested.key')`.

**Loyalty code redemption** runs in a Prisma `$transaction` with `isolationLevel: Serializable` to guarantee a code can never be redeemed twice. Codes are stored AES-256-GCM encrypted; lookups use SHA-256 hashes (`codeHash` column).

**Auth flow**: Argon2id passwords, JWT access tokens (15 min default), rotating refresh tokens (30 days) with reuse detection via Redis, OTP (stored in Redis) for phone/email verification and password reset.

**Roles**: `SUPER_ADMIN`, `CAMPAIGN_MANAGER`, `REGIONAL_MANAGER`, `OUTLET_MANAGER`, `CUSTOMER` (Prisma enum `UserRole`).

## Web architecture (`apps/web`)

**Route groups**:
- `(auth)` — login, register, verify-otp, forgot-password, reset-password
- `/admin` — SUPER_ADMIN / CAMPAIGN_MANAGER / REGIONAL_MANAGER dashboard
- `/outlet` — OUTLET_MANAGER dashboard
- `/customer` — CUSTOMER dashboard

**Data fetching pattern**: feature-level React Query hooks live in `src/features/<domain>/use-<domain>.ts`. Each hook calls `api.get/post/patch/delete` from `src/lib/api-client.ts`. Query keys are centralized in `src/lib/query-keys.ts`.

**API client** (`src/lib/api-client.ts`): typed fetch wrapper that injects the Bearer token, unwraps the `{ success, data }` envelope, and transparently retries on 401 with a token refresh (refresh token stored in `localStorage`).

**Auth utilities** (`src/lib/auth.ts`): `useMe()`, `useAuth({ redirectTo, roles })`, `useLogout()`, `persistSession()`, `roleHome(role)`. The `useAuth` hook handles role-based redirects automatically.

**UI primitives**: Radix UI components wrapped in shadcn/ui conventions under `src/components/ui/`. Charts use Recharts wrapped in `src/components/charts/`. Dashboard layout via `DashboardShell` + `Sidebar` + `Topbar` in `src/components/layout/`.

**Styling**: Tailwind CSS v3 + `tailwind-merge` + `clsx`. Dark mode via `next-themes` with `class` strategy.

## Environment variables

Key vars the API reads (see `src/config/configuration.ts` for full list):

| Var | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing keys |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM (64 hex chars) |
| `API_CORS_ORIGINS` | Comma-separated allowed origins |

Web needs `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000/api/v1`).
