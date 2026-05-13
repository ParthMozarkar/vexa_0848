# VEXA — Environment variable inventory

Variables discovered in **Next.js (`frontend/`)** and **Python (`backend/`)**.  
**Public** = safe to expose to the browser (`NEXT_PUBLIC_*`). **Secret** = server-only.

## Next.js — public

| Variable | Used for |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + anon server reads |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL, fallbacks, avatar stub |
| `NEXT_PUBLIC_SITE_URL` | Sitemap / robots base |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics |

## Next.js — server secrets / config

| Variable | Used for |
|----------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | **Required in production** for privileged DB (see `src/lib/env.ts`) |
| `INTERNAL_SERVICE_TOKEN` | Webhook + Python service auth |
| `INTERNAL_ONBOARDING_KEY` | Dev-only marketplace bypass (`apiKeyMiddleware`) |
| `DEV_API_KEY` | Dev-only raw API key (`apiKeyMiddleware`) |
| `VEXA_ADMIN_KEY` | Admin routes (`/api/keys/*`, `/api/user/delete`) |
| `TNB_API_KEY` / `NEWBLACK_API_KEY` | TheNewBlack virtual try-on |
| `OPENAI_API_KEY` | OpenAI chat / image / trends |
| `ANAKIN_API_KEY` | Trends route alternate |
| `MESHY_API_KEY` | Garment image → 3D |
| `BLACKBOX_API_KEY` | Studio model/video |
| `SEEDREAM_API_KEY` / `SEEDREAM_ENDPOINT` / `SEEDREAM_MODEL` | Design route optional path |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_URL` | Cloudflare R2 uploads |
| `AVATAR_SERVICE_URL` / `PYTHON_SERVICE_URL` | FastAPI avatar service |
| `RESEND_API_KEY` | Booking confirmation email |
| `GOOGLE_PRIVATE_KEY` / `GOOGLE_CLIENT_EMAIL` / `GOOGLE_CALENDAR_ID` | Booking calendar |
| `WHITELISTED_IPS` | IP rate-limit bypass list |

## Python backend

| Variable | Used for |
|----------|-----------|
| `INTERNAL_SERVICE_TOKEN` | Bearer auth for `/generate-avatar*` |
| `R2_*` | SMPL-X pipeline upload |
| `NEXT_PUBLIC_APP_URL` | Stub avatar URL host |
| `ALLOWED_ORIGINS` | Extra CORS origins |
| `SMPLX_MODEL_PATH` | SMPL-X weights directory |

## Stabilization notes

- `getServerSupabaseSecretKey()` in `frontend/src/lib/env.ts` **throws in production** if `SUPABASE_SERVICE_ROLE_KEY` is missing; **development** falls back to anon with a **one-time console warning**.
- FastAPI rejects missing `INTERNAL_SERVICE_TOKEN` when `VERCEL_ENV`, `ENVIRONMENT`, or `NODE_ENV` is **`production`**.
