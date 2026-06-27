# Project Status — Amstel Rewards Platform

> Last updated: 2026-06-27

---

## Infrastructure (Production)

| Layer | Service | Status |
|---|---|---|
| API (NestJS) | Render Web Service `amstel-api` | ✅ Live |
| Database | Render PostgreSQL `amstel` (Oregon) | ✅ Live |
| Cache | Render Redis `amstel-redis` | ✅ Live |
| Web (Next.js) | Vercel | ⏳ Not connected yet |
| Object storage | — | ⏳ Not configured (MinIO for local dev only) |
| Email / SMS | — | ⏳ Mock (providers not wired) |

**Repo:** https://github.com/Pristine-technologies-ltd/amstel-hub  
**CI/CD:** Auto-deploy on push to `main` (Render). Vercel pending connection.

---

## Backend — Module Status

| Module | API endpoints | Tests | Notes |
|---|---|---|---|
| `auth` | ✅ Full | ✅ | Register, OTP verify, login, refresh rotation, forgot/reset |
| `users` | ✅ `/me`, list, get | ✅ | Admin user search + pagination |
| `loyalty` | ✅ Redeem, wallet, transactions | ✅ | Atomic one-time redemption (Serializable tx) |
| `health` | ✅ `/health` | — | Liveness + DB check |
| `campaigns` | 🔧 Scaffolded | — | CRUD wired, bulk code gen pending BullMQ |
| `rewards` | 🔧 Scaffolded | ✅ | Catalog + approval flow, inventory reservation |
| `tournaments` | 🔧 Scaffolded | ✅ | Bracket generation scaffolded |
| `outlets` | 🔧 Scaffolded | — | CRUD, geo hierarchy |
| `leaderboards` | 🔧 Scaffolded | — | Hourly cron + Redis cache |
| `analytics` | 🔧 Scaffolded | — | KPI aggregates |
| `notifications` | 🔧 Scaffolded | — | In-app feed; BullMQ delivery not wired |
| `storage` | 🔧 Scaffolded | — | S3 presigned URLs (needs real credentials) |
| `audit` | 🔧 Scaffolded | — | Global interceptor |
| `fraud` | 🔧 Scaffolded | — | Velocity checks + review queue |
| `reports` | 🔧 Scaffolded | — | CSV export (Excel/PDF pending) |

**18 passing unit tests.** API typechecks clean.

---

## Frontend — Dashboard Status

| Dashboard | Route | Status |
|---|---|---|
| Customer — wallet & redemption | `/customer` | ✅ Built |
| Customer — rewards | `/customer/rewards` | ✅ Built |
| Customer — tournaments | `/customer/tournaments` | ✅ Built |
| Customer — leaderboard | `/customer/leaderboard` | ✅ Built |
| Customer — notifications | `/customer/notifications` | ✅ Built |
| Customer — history | `/customer/history` | ✅ Built |
| Customer — profile | `/customer/profile` | ✅ Built |
| Admin — overview | `/admin` | ✅ Built |
| Admin — customers | `/admin/customers` | ✅ Built |
| Admin — campaigns | `/admin/campaigns` | ✅ Built |
| Admin — rewards | `/admin/rewards` | ✅ Built |
| Admin — tournaments | `/admin/tournaments` | ✅ Built |
| Admin — outlets | `/admin/outlets` | ✅ Built |
| Admin — leaderboards | `/admin/leaderboards` | ✅ Built |
| Admin — reports | `/admin/reports` | ✅ Built |
| Admin — settings | `/admin/settings` | ✅ Built |
| Outlet — overview | `/outlet` | ✅ Built |
| Outlet — customers | `/outlet/customers` | ✅ Built |
| Outlet — tournaments | `/outlet/tournaments` | ✅ Built |
| Outlet — reports | `/outlet/reports` | ✅ Built |
| Auth flows | `/login`, `/register`, `/verify-otp`, etc. | ✅ Built |

Web typechecks clean. **Note:** dashboards are UI-complete but most features are connected to stubbed/scaffolded backend endpoints — full interactivity lands as each backend module is completed.

---

## Remaining Development

### High priority (core product)
- [ ] **Vercel deployment** — connect `Pristine-technologies-ltd/amstel-hub` to Vercel, set `NEXT_PUBLIC_API_URL`
- [ ] **Object storage** — provision Cloudflare R2 bucket, set `S3_*` env vars on Render
- [ ] **`campaigns` module** — complete bulk code generation (BullMQ job, CSV + QR export)
- [ ] **`rewards` module** — complete manager approval workflow, inventory debit transaction
- [ ] **`tournaments` module** — bracket progression, match results, winner recording
- [ ] **`outlets` module** — geo hierarchy (Region/Province/District), outlet dashboard aggregates
- [ ] **`leaderboards` module** — wire Redis sorted sets, verify hourly cron on Render

### Medium priority
- [ ] **BullMQ** — wire notification fan-out (email via SMTP, SMS via Africa's Talking/Twilio, FCM push)
- [ ] **`notifications` module** — real provider adapters (currently mock)
- [ ] **`analytics` module** — materialized views / raw SQL for national KPIs
- [ ] **`reports` module** — Excel + PDF generation (CSV done), presigned download via R2
- [ ] **`fraud` module** — production velocity rules, IP/geo anomaly logic
- [ ] **`audit` module** — full mutation diff logging

### Lower priority / polish
- [ ] **GitHub Actions CI** — lint + typecheck + test on PR, build check on main
- [ ] **E2E tests** (Playwright) — auth flow, redemption flow, admin dashboard
- [ ] **QR image generation** — per-code QR PNG stored in R2
- [ ] **OpenTelemetry** — traces + metrics, alert on `/health` degradation
- [ ] **BullMQ Bull Board** — admin UI for queue monitoring
- [ ] **i18n** — Kinyarwanda / French / English
- [ ] **Excel/PDF reports** — upgrade from CSV-only

---

## Environment Checklist

### Render (`amstel-api`)
- [x] `NODE_ENV=production`
- [x] `DATABASE_URL` — from Render Postgres internal URL
- [x] `REDIS_URL` — auto-wired from `amstel-redis`
- [x] `JWT_ACCESS_SECRET` — Render auto-generated
- [x] `JWT_REFRESH_SECRET` — Render auto-generated
- [ ] `ENCRYPTION_KEY` — `openssl rand -hex 32`
- [ ] `API_CORS_ORIGINS` — your Vercel URL
- [ ] `S3_*` — Cloudflare R2 credentials
- [ ] `SMTP_*` — email provider
- [ ] `SMS_API_KEY` — Africa's Talking / Twilio

### Vercel (`amstel-web`) — pending
- [ ] Connect repo at vercel.com → New Project
- [ ] `NEXT_PUBLIC_API_URL` — `https://<your-render-service>.onrender.com/api/v1`
