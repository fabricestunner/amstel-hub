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

## Roadmap endpoints (planned — see ROADMAP.md)
- `/campaigns`, `/campaigns/:id/codes` (batch generation)
- `/rewards`, `/rewards/:id/redeem`, `/reward-redemptions` (approval)
- `/tournaments`, `/tournaments/:id/register`, `/tournaments/:id/bracket`
- `/outlets`, `/outlets/:id/dashboard`
- `/leaderboards/customers`, `/leaderboards/outlets`
- `/analytics/overview`, `/analytics/trends`
- `/notifications`, `/notifications/preferences`
- `/reports/{customers,outlets,sales,points}` (csv|xlsx|pdf)
- `/fraud/flags`, `/audit-logs`
