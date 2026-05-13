# VEXA — External provider inventory

| Provider | Capability | Entry points |
|----------|------------|--------------|
| **Supabase** | Auth, Postgres, Storage (`avatars` bucket) | `lib/supabase.ts`, `lib/supabaseServer.ts`, most `/api/*` |
| **Cloudflare R2** (S3 API) | Object storage for uploads / try-ons | `lib/r2.ts`, try-on + design + upload |
| **TheNewBlack (TNB)** | 2D virtual try-on | `POST /api/tryon` (`callTNB`) |
| **OpenAI** | Chat, images, trends | `/api/studio/design`, `/api/studio/trends` |
| **Meshy** | Image → 3D garment | `/api/clothing`, `/api/clothing/status/[taskId]` |
| **BlackBox** | Model + video generation | `/api/studio/model-gen`, `/api/studio/video-gen` |
| **Google Calendar API** | Booking events | `/api/bookings` |
| **Resend** | Transactional email | `/api/bookings` |
| **Vercel Analytics / GA** | Product analytics | `layout.tsx` |

## Internal services

| Service | Role |
|---------|------|
| **FastAPI (`backend/main.py`)** | `/health`, `/generate-avatar`, `/generate-avatar-full` |

## Unused / optional in repo

| Package / ref | Status |
|----------------|--------|
| `@tavily/core` | Declared in `package.json`; **no `src` usage found** |
| `@sentry/nextjs` | Config files present; **not in dependencies** (excluded from `tsc`) |
