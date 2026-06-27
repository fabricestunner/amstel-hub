# API Reference — Amstel Rewards Platform

Base URL: `http://localhost:4000/api/v1` · Interactive docs (Swagger): `/docs`

All responses use a consistent envelope:
```json
{ "success": true, "data": { ... } }
```
Errors:
```json
{ "success": false, "statusCode": 400, "message": "…", "errors": [ … ],
  "path": "/api/v1/…", "timestamp": "2026-06-27T…Z" }
```

Auth: send `Authorization: Bearer <accessToken>`. Access tokens last 15 min;
use `/auth/refresh` to rotate. List endpoints accept
`?page=&limit=&search=&sortBy=&sortOrder=` and return `{ items, meta }`.

---

## Auth `/auth` (public unless noted)

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ phone, password, email?, firstName?, lastName?, outletCode? }` | Creates customer + wallet, sends OTP. Rate-limited 5/min. |
| POST | `/auth/verify-phone` | `{ phone, code }` | Verifies OTP → returns token pair. |
| POST | `/auth/login` | `{ identifier, password }` | `identifier` = phone or email. |
| POST | `/auth/refresh` | `{ refreshToken }` | Rotates refresh token. |
| POST | `/auth/logout` | — *(auth)* | Revokes all refresh tokens. |
| POST | `/auth/forgot-password` | `{ identifier }` | Sends reset OTP (no enumeration). |
| POST | `/auth/reset-password` | `{ phone, code, newPassword }` | Resets + revokes sessions. |

## Users `/users` *(auth)*
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/users/me` | any | Current profile. |
| GET | `/users` | SUPER_ADMIN, CAMPAIGN_MANAGER | Paginated + search. |
| GET | `/users/:id` | SUPER_ADMIN, CAMPAIGN_MANAGER | Single user. |

## Loyalty `/loyalty` *(auth)*
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/loyalty/redeem` | CUSTOMER | `{ code, outletCode?, deviceId?, geoLat?, geoLng? }` → `{ pointsEarned, availablePoints, campaign }`. Atomic one-time redemption. Rate-limited 20/min. |
| GET | `/loyalty/wallet` | any | `{ availablePoints, redeemedPoints, lifetimePoints }`. |
| GET | `/loyalty/transactions` | any | Paginated ledger. |

## Health `/health` (public)
| GET | `/health` | Liveness + DB check. |

---

## Campaigns `/campaigns` *(auth)*
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/campaigns` | SUPER_ADMIN, CAMPAIGN_MANAGER | Paginated, search, filter by status. |
| GET | `/campaigns/active` | any | Active campaigns for customers. |
| POST/PATCH | `/campaigns(/:id)` | SUPER_ADMIN, CAMPAIGN_MANAGER | Create / update; status state-machine. |
| POST | `/campaigns/:id/codes/generate` | SUPER_ADMIN, CAMPAIGN_MANAGER | Bulk-generate encrypted one-time codes. |

## Rewards `/rewards` · `/reward-redemptions` *(auth)*
| GET `/rewards` | any | Active catalog (filter by campaign/type). |
| POST `/rewards/:id/redeem` | CUSTOMER | Atomic points debit + redemption (tournament entry supported). |
| GET `/reward-redemptions` · PATCH `/reward-redemptions/:id/{approve,reject,fulfill}` | SUPER_ADMIN, CAMPAIGN_MANAGER | Approval workflow. |

## Tournaments `/tournaments` *(auth)*
| GET list/`:id`/`:id/bracket`; POST `:id/register` (CUSTOMER); POST `:id/bracket/generate`; PATCH `:id/matches/:matchId/result` (admin). |

## Outlets `/outlets` *(auth)*
| GET `/outlets` (region/outlet-scoped), GET `/outlets/:id/dashboard`; CRUD (SUPER_ADMIN); region/province/district reads. |

## Leaderboards / Analytics / Notifications *(auth)*
| GET `/leaderboards/customers`, `/leaderboards/outlets`; GET `/analytics/overview`, `/analytics/trends`; GET/PATCH `/notifications`, `/notifications/preferences`, `/notifications/:id/read`, `/notifications/read-all`. |

## Storage `/storage` *(auth)*
| POST `/storage/presign-upload` (admin/outlet) → `{ key, uploadUrl, publicUrl }`; GET `/storage/presign-download?key=` → `{ url }`. S3/MinIO presigned. |

## Reports `/reports` *(SUPER_ADMIN, CAMPAIGN_MANAGER)*
| GET `/reports/customers.csv`, `/reports/outlets.csv`, `/reports/transactions.csv?campaignId=` — CSV download. Excel/PDF planned. |

## Fraud & Audit *(admin)*
| GET `/fraud/flags` (filter status/severity), PATCH `/fraud/flags/:id/resolve`; GET `/audit-logs` (SUPER_ADMIN). Mutations are auto-recorded by a global audit interceptor; redemption velocity is checked on every `/loyalty/redeem`.

## Still on the roadmap
- Excel (`.xlsx`) and PDF report exports + async generation to MinIO.
- Real notification delivery adapters (SMTP / SMS / FCM) behind the queue.
