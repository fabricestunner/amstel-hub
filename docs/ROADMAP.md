# Implementation Roadmap

Module-by-module build plan. The `auth` + `loyalty` slice is already
implemented as the reference pattern; every phase below follows it
(`Controller → Service → Prisma`, DTO validation, guards, Swagger, unit tests).

## ✅ Phase 0 — Foundation (done in this scaffold)
- Monorepo (pnpm + Turborepo), Docker infra (Postgres/Redis/MinIO/Mailpit).
- Full Prisma schema + seed data.
- Auth: register, OTP verify, login, refresh rotation, forgot/reset, RBAC.
- Loyalty: atomic one-time code redemption, wallet, transactions.
- Web: Next.js 15 shell, API client, customer wallet page.
- Docs + unit tests (crypto, loyalty).

## Phase 1 — Campaigns & code generation
- `CampaignsModule`: CRUD, scheduling (DRAFT→ACTIVE→ENDED), status guards.
- Bulk **code batch generation** (BullMQ job) → encrypted codes + CSV export to MinIO.
- QR image generation per code.

## Phase 2 — Rewards engine
- `RewardsModule`: catalog, inventory reservation, per-user limits, validity.
- Redemption workflow: PENDING → APPROVED → FULFILLED/REJECTED with wallet debit in a tx.
- Manager approval UI.

## Phase 3 — Tournaments
- `TournamentsModule`: create, registration (points-gated), capacity.
- **Bracket generation** (seeding, byes), match progression via `nextMatchId`.
- Results entry, winner/runner-up, tournament history.

## Phase 4 — Outlets & geography
- `OutletsModule`: CRUD, Region/Province/District management.
- Outlet dashboard aggregates (sales, points, customers, ranks).
- Region scoping for Regional Managers.

## Phase 5 — Leaderboards
- Redis sorted sets for live ranks; scheduled job materializes `LeaderboardEntry`.
- Customer (monthly/lifetime) + outlet (national/regional/campaign) boards.

## Phase 6 — Notifications
- `NotificationsModule`: BullMQ fan-out, channel adapters (SMTP, SMS provider, FCM).
- Preferences, in-app feed, templated events ("You earned 20 points", "Ranked #5").

## Phase 7 — Analytics & reporting
- `AnalyticsModule`: KPI aggregates, trends, top regions/outlets/customers (materialized views / raw SQL).
- `ReportsModule`: CSV/Excel/PDF generation → MinIO presigned download.

## Phase 8 — Anti-fraud & audit hardening
- `AuditModule`: global interceptor writing before/after diffs on mutations.
- `FraudModule`: velocity checks, geo/IP/device anomaly rules, review queue.

## Phase 9 — Dashboards polish & E2E
- Admin/outlet/customer dashboards (charts, tables, filters, export, dark mode).
- Playwright E2E, CI pipeline, production Docker + deploy.

## Cross-cutting backlog
- BullMQ wiring + Bull Board.
- OpenTelemetry traces/metrics.
- i18n, accessibility pass.
- Rate-limit tuning, WAF, secrets manager in prod.
