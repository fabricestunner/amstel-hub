# Database Design — Amstel Rewards Platform

PostgreSQL 16 · Prisma · normalized · soft-deletes · audit trail.
Source of truth: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma).

## Conventions
- **UUID** primary keys (`@db.Uuid`, `uuid()` default).
- **snake_case** table names via `@@map`; camelCase in the Prisma client.
- **Soft deletes** via `deletedAt` on long-lived entities (users, outlets,
  campaigns, rewards, tournaments, regions). Query helper: `prisma.notDeleted`.
- **Audit**: `AuditLog` (append-only, before/after JSON) + `LoginAudit`.
- **Money** as `Decimal(14,2)`; **points** as `BigInt` (lifetime totals can grow large).
- **Indexes** on every foreign key and hot query path.

## Entity-relationship diagram

```mermaid
erDiagram
    User ||--o| Wallet : has
    User ||--o{ RefreshToken : owns
    User ||--o{ OtpCode : requests
    User ||--o{ CodeRedemption : performs
    User ||--o{ PointsTransaction : has
    User ||--o{ RewardRedemption : claims
    User ||--o{ TournamentRegistration : enters
    User ||--o{ Notification : receives
    User ||--o{ DeviceToken : registers
    User ||--o{ UserPermission : granted
    Permission ||--o{ UserPermission : in

    Region ||--o{ Province : contains
    Province ||--o{ District : contains
    District ||--o{ Outlet : contains
    Region ||--o{ Outlet : groups
    Region ||--o{ User : "scopes managers"
    Outlet ||--o| User : "managed by"
    Outlet ||--o{ User : "registers customers"

    Campaign ||--o{ LoyaltyCode : issues
    Campaign ||--o{ Reward : offers
    Campaign ||--o{ Tournament : hosts
    Campaign ||--o{ PointsTransaction : scopes

    LoyaltyCode ||--o| CodeRedemption : "redeemed via"
    CodeRedemption ||--o| PointsTransaction : produces
    Wallet ||--o{ PointsTransaction : "balance of"

    Reward ||--o{ RewardRedemption : "claimed via"
    RewardRedemption ||--o| PointsTransaction : produces

    Tournament ||--o{ TournamentRegistration : has
    Tournament ||--o{ TournamentMatch : "bracket of"
    TournamentMatch ||--o{ TournamentMatch : "feeds into"

    Outlet ||--o{ LeaderboardEntry : ranked
    Campaign ||--o{ LeaderboardEntry : scopes

    User ||--o{ FraudFlag : flagged
    User ||--o{ AuditLog : acts
    User ||--o{ LoginAudit : "login attempts"
```

## Domain groupings

**Identity & access** — `User`, `Permission`, `UserPermission`,
`RefreshToken`, `OtpCode`, `LoginAudit`, `DeviceToken`.

**Geography** — `Region › Province › District › Outlet`. Outlets denormalize
`regionId`/`provinceId`/`districtId` for fast scoped queries. One manager per
outlet (1:1); customers reference the outlet they registered through.

**Campaigns** — `Campaign` owns codes, rewards, tournaments and configures
`pointsPerCode` + `pointsExpiryDays`.

**Loyalty ledger** — `LoyaltyCode` (one-time, `codeHash` unique + `codeCipher`
encrypted) → `CodeRedemption` (unique `codeId` enforces single use) →
`PointsTransaction` (signed, immutable ledger) → `Wallet` (derived balances).

**Rewards** — `Reward` (type/inventory/cost/validity) → `RewardRedemption`
(approval workflow) → `PointsTransaction` (debit).

**Tournaments** — `Tournament` → `TournamentRegistration` (unique per user) and
`TournamentMatch` (self-referential `nextMatchId` models the bracket).

**Leaderboards** — `LeaderboardEntry` materialized snapshots keyed by
`(type, period, subject, campaign)`, recomputed by a scheduled job; live ranks
served from Redis sorted sets.

**Notifications** — `Notification`, `NotificationPreference`, `DeviceToken`.

**Anti-fraud & audit** — `FraudFlag` (severity + status review queue),
`AuditLog`, `LoginAudit`.

## Integrity highlights
- One-time code use: **two** guarantees — `CodeRedemption.codeId @unique` and a
  conditional `updateMany(where status=ACTIVE)` inside a Serializable tx.
- Wallet never drifts: balance mutations and ledger rows are written atomically.
- Refresh-token reuse detection via the `family` column.
- `@@unique([tournamentId, userId])` blocks double tournament entry.

## Migrations
```bash
pnpm db:generate   # prisma client
pnpm db:migrate    # create/apply dev migration
pnpm db:seed       # demo data + printable sample codes
pnpm db:studio     # browse data
```
