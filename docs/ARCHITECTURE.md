# Architecture — Amstel Rewards Platform

> Enterprise Loyalty, Rewards & Tournament Management Platform for a nationwide
> brewery campaign. This document is the system design of record.

---

## 1. High-level overview

A multi-tenant-style loyalty platform where **customers** earn points from
encrypted promo/QR/bottle codes printed on Amstel products, redeem them for
**rewards** and **tournament entries**, and compete on **leaderboards**.
**Outlets** compete on sales & engagement; **regional/campaign managers** and
**super admins** monitor everything from role-scoped dashboards.

```
                         ┌─────────────────────────────┐
        Customer ───────▶│        Next.js 15 Web        │
   Outlet Manager ──────▶│  (App Router · RSC · RQ)     │
  Regional Manager ─────▶│  admin / outlet / customer   │
  Campaign Manager ─────▶│        dashboards            │
     Super Admin ───────▶└──────────────┬──────────────┘
                                         │ HTTPS  (Bearer JWT)
                                         ▼
                         ┌─────────────────────────────┐
                         │         NestJS API           │
                         │  feature modules · guards ·  │
                         │  DTO validation · Swagger     │
                         └───┬───────┬───────┬──────┬───┘
                             │       │       │      │
                    ┌────────▼─┐ ┌───▼───┐ ┌─▼───┐ ┌▼─────────┐
                    │PostgreSQL│ │ Redis │ │MinIO│ │ Notifiers │
                    │ (Prisma) │ │cache /│ │ S3  │ │ email/sms │
                    │          │ │queue /│ │     │ │  / push   │
                    │          │ │ratelim│ │     │ │           │
                    └──────────┘ └───────┘ └─────┘ └───────────┘
```

---

## 2. Stack decisions & advice (backend focus)

You asked specifically for backend stack advice. Here are the choices baked
into this scaffold and the reasoning:

| Concern | Choice | Why |
|---|---|---|
| **API framework** | **NestJS** | Opinionated DI + module system maps 1:1 to the feature domains (auth, loyalty, tournaments…). First-class Swagger, guards, interceptors, validation pipes. Scales to a large team. |
| **Language** | **TypeScript (strict)** | Shared types with the Next.js frontend via `packages/shared`. |
| **ORM** | **Prisma** | Type-safe queries, painless migrations, great DX. The one caveat at scale (see below). |
| **DB** | **PostgreSQL 16** | Transactions for the points ledger, partial indexes, JSONB for audit diffs, strong constraints. |
| **Cache / realtime / queue** | **Redis (ioredis)** | Rate-limit store, leaderboard cache (sorted sets), and a **BullMQ** queue for notifications & async leaderboard recompute. |
| **Auth** | **JWT access + rotating refresh tokens** | Stateless access tokens (15 min) + DB-tracked refresh-token families with **reuse detection**. Argon2id password hashing. Phone OTP + email verification. |
| **Object storage** | **MinIO (S3 API)** | Reward images, campaign banners, report exports, QR assets. Swap for AWS S3 in prod by changing env only. |
| **Logging** | **nestjs-pino** | Structured JSON logs, request correlation, redaction of secrets. |
| **Validation** | **class-validator + class-transformer** | DTO-level validation, auto-stripping unknown fields (`whitelist`). |

### Recommended additions as you grow (not all scaffolded yet)
- **BullMQ** (Redis-backed) for: notification fan-out, leaderboard recompute,
  points expiry, bulk code generation, report generation. Keeps request paths
  fast and gives retries/observability.
- **A read model / materialized views** for analytics & leaderboards so heavy
  aggregation never blocks transactional traffic. The `LeaderboardEntry` table
  is exactly this — recomputed by a scheduled job.
- **Prisma at scale caveat**: for very hot aggregate queries (national
  analytics), drop to raw SQL / materialized views via `prisma.$queryRaw`.
  Prisma stays the default; raw SQL is the escape hatch.
- **Outbox pattern** for cross-service events if you later split services. For
  now a modular monolith is the right call — don't prematurely microservice.

### Why a modular monolith (not microservices) now
The whole platform fits one deployable NestJS app with clean module
boundaries. You get transactional integrity on the points ledger for free, far
simpler ops, and you can carve out a service later along an existing module
seam if a hotspot demands it.

---

## 3. Monorepo layout

```
amstel-rewards-platform/
├── apps/
│   ├── api/                  # NestJS API (the brain)
│   │   ├── prisma/
│   │   │   ├── schema.prisma # full normalized schema
│   │   │   └── seed.ts       # demo data + sample codes
│   │   └── src/
│   │       ├── common/       # prisma, crypto, guards, decorators,
│   │       │                 #   filters, interceptors, dto
│   │       ├── config/       # typed env configuration
│   │       └── modules/      # feature modules (see §5)
│   └── web/                  # Next.js 15 App Router
│       └── src/
│           ├── app/          # routes: admin / outlet / customer
│           ├── components/ui # shadcn primitives
│           ├── features/     # feature-scoped hooks + components
│           └── lib/          # api client, utils
├── packages/
│   └── shared/               # types/enums/zod shared by web + api
├── docs/                     # this folder
├── docker-compose.yml        # postgres · redis · minio · mailpit
├── turbo.json                # task orchestration
└── .env.example              # all configuration
```

**Clean architecture per module**: `Controller → Service → (Repository via
Prisma)`. DTOs guard the boundary, services hold business rules, Prisma is the
data layer. Cross-cutting concerns live in `common/`.

---

## 4. User roles & access model

RBAC is enforced by a global `JwtAuthGuard` (opt out with `@Public()`) plus a
`RolesGuard` reading `@Roles(...)`. `SUPER_ADMIN` bypasses role checks.
Fine-grained `Permission`/`UserPermission` records allow per-user overrides on
top of role defaults.

| Role | Scope |
|---|---|
| **Super Admin** | Everything. |
| **Campaign Manager** | Create campaigns, manage tournaments, approve rewards, view reports. |
| **Regional Manager** | Read-only across outlets in **their region** (`regionId` scoping). |
| **Outlet Manager** | Their **single outlet** only (ranks, sales, customers, entries, reports). |
| **Customer** | Own wallet, redemptions, rewards, tournaments, leaderboard, notifications. |

Row-level scoping (region/outlet) is applied in service-layer `where` clauses
derived from the authenticated user, never trusted from the client.

---

## 5. Feature modules (NestJS)

| Module | Status | Responsibility |
|---|---|---|
| `auth` | ✅ implemented | Register, login, phone OTP, email verify, forgot/reset, JWT + refresh rotation. |
| `users` | ✅ implemented | Profile (`/me`), admin user listing/search. |
| `loyalty` | ✅ implemented | **Code redemption (atomic, one-time)**, wallet, transaction history. |
| `health` | ✅ implemented | Liveness + DB check. |
| `campaigns` | 🔜 roadmap | CRUD, scheduling, code batch generation. |
| `rewards` | 🔜 roadmap | Reward catalog, inventory, redemption approval workflow. |
| `tournaments` | 🔜 roadmap | Tournaments, registrations, bracket generation, results. |
| `outlets` | 🔜 roadmap | Outlet CRUD, geo hierarchy, performance metrics. |
| `leaderboards` | 🔜 roadmap | Redis sorted-sets + materialized snapshots, scheduled recompute. |
| `analytics` | 🔜 roadmap | Admin KPIs, trends, top regions/outlets/customers. |
| `notifications` | 🔜 roadmap | Email/SMS/push via BullMQ, preferences, in-app feed. |
| `reports` | 🔜 roadmap | CSV/Excel/PDF exports to MinIO. |
| `fraud` | 🔜 roadmap | Velocity checks, geo/IP/device anomaly flags, review queue. |
| `audit` | 🔜 roadmap | Append-only audit log interceptor for all mutations. |
| `storage` | 🔜 roadmap | MinIO presigned upload/download. |

The implemented `auth` + `loyalty` slice is a **vertical reference
implementation** — every roadmap module follows its exact patterns.

---

## 6. Key flows

### 6.1 Customer registration & verification
1. `POST /auth/register` → creates `PENDING` user + empty `Wallet`, issues phone OTP.
2. `POST /auth/verify-phone` → validates OTP, flips user to `ACTIVE`, returns token pair.

### 6.2 Earning points (the core loop)
1. Customer scans QR / enters code → `POST /loyalty/redeem`.
2. Service opens a **Serializable** transaction:
   - look up by `codeHash` (raw code never stored in plaintext),
   - reject if redeemed/expired/void or campaign inactive,
   - **atomically** claim the code (`updateMany where status=ACTIVE`),
   - create `CodeRedemption` (unique on `codeId` → hard one-time guarantee),
   - increment wallet, write signed `PointsTransaction` (ledger).
3. Emits `points.earned` → notification + leaderboard recompute (roadmap).

### 6.3 Redeeming a reward / tournament entry (roadmap)
Reserve inventory → debit wallet in a transaction → create `RewardRedemption`
(`PENDING`) → manager approves → `FULFILLED`. Tournament entry is a reward type
that also creates a `TournamentRegistration`.

### 6.4 Token refresh
Access token (15 min) expires → client calls `POST /auth/refresh`. The refresh
token is hashed in DB and **rotated**; presenting an already-rotated token
revokes the whole family (theft detection).

---

## 7. Non-functional concerns

- **Security**: Helmet, global rate limiting (`@nestjs/throttler`, stricter on
  auth/redeem), strict DTO validation, Argon2id, AES-256-GCM for codes/PII,
  Prisma parameterization (no SQL injection), CORS allowlist. See
  [DEPLOYMENT.md](./DEPLOYMENT.md) for the production hardening checklist.
- **Anti-fraud**: one-time codes, redemption rate limits, IP/device/geo capture
  on every redemption, `FraudFlag` review queue, full `AuditLog`.
- **Observability**: structured pino logs, `/health`, ready for OpenTelemetry.
- **Performance**: Redis caching + sorted-set leaderboards, materialized
  snapshot tables, DB indexes on every hot path (see schema `@@index`).
- **Consistency**: the points ledger is the source of truth; wallet balances
  are derived and always written inside the same transaction.

See [DATABASE.md](./DATABASE.md) for the data model and [ROADMAP.md](./ROADMAP.md)
for the module-by-module build plan.
```
