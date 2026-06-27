<div align="center">

# 🍺 Amstel Rewards Platform

**Enterprise Loyalty, Rewards & Tournament Management Platform**
for a nationwide brewery campaign.

Next.js 15 · NestJS · PostgreSQL · Prisma · Redis · MinIO · Docker

</div>

---

## What this is

Customers buy Amstel products, redeem encrypted promo/QR/bottle codes to earn
loyalty points, spend points on rewards and **pool-tournament** entries, and
climb national leaderboards. Outlets compete on sales & engagement; regional
and campaign managers and super admins monitor everything from role-scoped
dashboards.

This repository is a **production-ready monorepo foundation** with a fully
implemented auth + loyalty vertical slice and a documented roadmap for the
remaining modules.

## Monorepo

| Path | Description |
|---|---|
| `apps/api` | NestJS API — auth, loyalty engine, RBAC, Swagger, Prisma. |
| `apps/web` | Next.js 15 (App Router) — admin / outlet / customer dashboards. |
| `packages/shared` | Types, enums & zod schemas shared across apps. |
| `docs/` | Architecture, database, API, roadmap, deployment. |

## Quick start

```bash
cp .env.example .env
pnpm docker:up          # Postgres + Redis + MinIO + Mailpit
pnpm install
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev                # api :4000  ·  web :3000  ·  swagger :4000/docs
```

Seeded admin: `admin@amstel.com` / `Password123!` (sample codes print to console).

## Documentation
- 📐 [Architecture & stack decisions](docs/ARCHITECTURE.md)
- 🗄️ [Database design + ER diagram](docs/DATABASE.md)
- 🔌 [API reference](docs/API.md)
- 🗺️ [Implementation roadmap](docs/ROADMAP.md)
- 🚀 [Deployment guide](docs/DEPLOYMENT.md)

## Status

✅ Foundation · auth · loyalty engine (atomic one-time redemption) · wallet ·
docs · seed · tests.  🔜 campaigns, rewards, tournaments, outlets,
leaderboards, analytics, notifications, reports, fraud — see the
[roadmap](docs/ROADMAP.md).

## Tech highlights
- JWT access + **rotating refresh tokens** with reuse detection; Argon2id.
- **AES-256-GCM** encrypted loyalty codes; hashed lookups (no plaintext at rest).
- Points ledger with **Serializable** transactions — wallets never drift.
- RBAC guards + per-user permission overrides; region/outlet row scoping.
- Helmet, rate limiting, strict DTO validation, structured pino logging.

## License

Proprietary — © Amstel Rewards campaign. All rights reserved.
