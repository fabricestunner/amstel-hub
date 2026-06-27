# Deployment Guide

## Local development

```bash
# 1. Prerequisites: Node 20+, pnpm 9+, Docker.
cp .env.example .env            # then edit secrets

# 2. Start infrastructure (Postgres, Redis, MinIO, Mailpit).
pnpm docker:up

# 3. Install workspace deps.
pnpm install

# 4. Database: generate client, migrate, seed.
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. Run everything (turbo runs api + web in parallel).
pnpm dev
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Swagger | http://localhost:4000/docs |
| MinIO console | http://localhost:9001 (minioadmin/minioadmin) |
| Mailpit (email UI) | http://localhost:8025 |

Seeded admin: `admin@amstel.com` / `Password123!`. The seed prints sample
redeemable codes to the console.

## Production (recommended: Render API + Vercel web)

**Topology** — the web app talks to the API over HTTPS; only the API touches
the database. So the DB lives next to the API (same Render region).

```
Vercel (apps/web)  ──HTTPS──▶  Render: amstel-api (NestJS)
                                  ├── Render Postgres  (amstel, Oregon)
                                  ├── Render Key Value (amstel-redis)
                                  └── Cloudflare R2 / S3 (object storage)
```

### 1. API + Postgres + Redis on Render (Blueprint)
The repo ships [`render.yaml`](../render.yaml). In the Render dashboard:
**New → Blueprint → select this repo**. It provisions `amstel-api`,
`amstel-redis`, and links the `amstel` Postgres (Oregon). It auto-wires
`DATABASE_URL` and `REDIS_URL`, and generates the JWT secrets.

Set these manually (marked `sync:false`) under the service's Environment:
| Var | Value |
|---|---|
| `ENCRYPTION_KEY` | 32-byte hex — generate with `openssl rand -hex 32` |
| `API_CORS_ORIGINS` | your Vercel URL, e.g. `https://amstel-hub.vercel.app` |
| `S3_ENDPOINT` / `S3_REGION` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` / `S3_BUCKET` | from Cloudflare R2 or AWS S3 |
| `SMTP_*`, `SMS_*`, `FCM_*` | when wiring real notifications |

The API binds Render's injected `PORT`, runs `prisma migrate deploy` on every
deploy, and exposes a health check at `/api/v1/health`.

> If Render flags a conflict on the `databases:` block (because you already
> created the `amstel` DB by hand), delete that block from `render.yaml` and
> instead connect the existing database to the service in the dashboard.

### 2. Web app on Vercel
**New Project → import the repo → set Root Directory = `apps/web`.** Vercel
auto-detects Next.js ([`apps/web/vercel.json`](../apps/web/vercel.json) pins
the framework + pnpm install). Add one env var:
| Var | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://amstel-api.onrender.com/api/v1` (your Render API URL) |

After the API is live, copy its public Render URL into `NEXT_PUBLIC_API_URL`
and into the API's `API_CORS_ORIGINS` (the Vercel URL) so CORS passes.

### 3. Object storage (Cloudflare R2)
Create an R2 bucket + API token; set the `S3_*` vars on Render. R2 is
S3-compatible (`S3_FORCE_PATH_STYLE=true`), cheap, and has no egress fees.
MinIO (in `docker-compose.yml`) is for local dev only.

---

## Alternative: containers everywhere (Docker)

Both apps ship multi-stage Dockerfiles (`apps/api/Dockerfile`,
`apps/web/Dockerfile`, Next.js `standalone` output). Uncomment the `api` and
`web` services in `docker-compose.yml`, or deploy the images to your platform
(ECS/Fly/Render/K8s).

```bash
docker compose --profile full up -d --build
pnpm --filter @amstel/api db:deploy   # apply migrations (no prompts)
```

### Production hardening checklist
- [ ] Replace all secrets in `.env` (JWT secrets ≥32 chars, real `ENCRYPTION_KEY` = 32-byte hex).
- [ ] Managed Postgres with automated backups + PITR; connection pooling (PgBouncer).
- [ ] Managed Redis (TLS, auth) for cache/queues/leaderboards.
- [ ] Real S3 (set `S3_*`); private bucket + presigned URLs.
- [ ] SMTP + SMS + FCM provider credentials.
- [ ] TLS everywhere; HSTS; tighten `API_CORS_ORIGINS`.
- [ ] Rate limits tuned; WAF / DDoS protection in front.
- [ ] Centralized logging + APM (OpenTelemetry), alerts on `/health`.
- [ ] Run migrations as a deploy step, never auto-migrate on boot in prod.

## CI/CD (suggested GitHub Actions)
1. **lint + typecheck + test** on every PR (`pnpm lint && pnpm typecheck && pnpm test`).
2. **build** Docker images, push to registry on merge to `main`.
3. **migrate + deploy** to staging → smoke test → promote to prod.
4. **prisma migrate deploy** as a gated job before app rollout.
