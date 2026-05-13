# VEXA — Route inventory (App Router)

Generated for migration safety. **Pages** live under `frontend/src/app/**/page.tsx`. **API route handlers** live under `frontend/src/app/api/**/route.ts`.

## Marketing & content

| Method | Path |
|--------|------|
| GET | `/` |
| GET | `/3d` |
| GET | `/virtual-try-on` |
| GET | `/pricing` |
| GET | `/integration` |
| GET | `/studio` |
| GET | `/admin` |
| GET | `/design` |
| GET | `/video-tryon` |
| GET | `/products` |
| GET | `/products/[id]` |
| GET | `/blog` |
| GET | `/blog/[slug]` |
| GET | `/privacy` |
| GET | `/favorites` |
| GET | `/embed` |
| GET | `/ar/[productId]` |
| GET | `robots.ts` → `/robots.txt` |
| GET | `sitemap.ts` → `/sitemap.xml` |

## Auth & onboarding

| Method | Path |
|--------|------|
| GET/POST | `/auth/signup` |
| GET | `/onboarding` |
| GET | `/dashboard` |

## API routes (`/api/*`)

| Method | Path | Role |
|--------|------|------|
| GET | `/api/health` | Liveness / dependency probe |
| GET | `/api/proxy` | Image proxy (URL query) |
| POST | `/api/upload` | Multipart image → R2 / users |
| POST | `/api/auth/signup` | Admin create user + `users` row |
| POST | `/api/auth/login` | (if present) session |
| POST | `/api/avatar/generate` | Avatar pipeline bridge |
| GET | `/api/avatar/[userId]` | Avatar URL for self |
| POST | `/api/webhook/avatar-ready` | Internal webhook |
| POST | `/api/tryon` | 2D TNB try-on |
| POST | `/api/tryon/[productId]` | Authenticated product try-on (same engine) |
| POST | `/api/tryon/batch` | Batch try-on |
| POST | `/api/tryon/video` | Video job enqueue |
| GET | `/api/tryon/video/status` | Video job status |
| POST | `/api/clothing` | Meshy task create |
| GET | `/api/clothing/status/[taskId]` | Meshy poll + DB update |
| POST | `/api/studio/design` | OpenAI design |
| POST | `/api/studio/model-gen` | BlackBox model |
| POST | `/api/studio/video-gen` | BlackBox video |
| POST | `/api/studio/trends` | Trends / OpenAI |
| POST | `/api/size` | Size / fit helper |
| GET/POST | `/api/bookings` | Demo bookings + calendar |
| POST | `/api/ar/session` | AR session token |
| POST | `/api/keys/generate` | Admin API key mint |
| GET | `/api/keys/list` | Admin list keys |
| GET | `/api/keys/validate` | Key validation |
| POST | `/api/keys/revoke` | Admin revoke |
| GET | `/api/dashboard/stats` | Dashboard counts |
| GET | `/api/dashboard/analytics` | Analytics slice |
| POST | `/api/user/delete` | Admin user delete |

## Middleware

| Matcher | File | Behavior |
|---------|------|----------|
| `/api/:path*` | `frontend/middleware.ts` | Optional `x-vexa-key` validation + usage log insert |

## Notes

- `vexa-mobile-sdk` is referenced in root `README.md` but **not present** in this workspace snapshot.
- Python service routes are **`/health`**, **`/generate-avatar`**, **`/generate-avatar-full`** on `AVATAR_SERVICE_URL` (default `http://localhost:8000` per `start_all.ps1`).
