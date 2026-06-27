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

## Production (Docker)

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
