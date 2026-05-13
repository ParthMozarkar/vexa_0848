# VEXA Environment Variable Requirements

**Document Date:** 2026-05-13
**Scope:** All environment variables for `frontend/` (Next.js) and `backend/` (Python FastAPI)
**Reference files:** `frontend/.env.local.example`, `backend/.env.example`

---

## Important Security Rules

1. **`NEXT_PUBLIC_*` variables are embedded in the client JavaScript bundle.** They are visible
   to every user who visits the site. Never put secrets, API keys, or credentials in these vars.

2. **`SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security.** Treat it as a root database
   password. Never expose it to the client, log it, or commit it to git.

3. **`VEXA_ADMIN_KEY` grants full admin access.** Use a minimum 32-character random value.
   Rotate immediately if ever logged, exposed in an error message, or shared accidentally.

4. **`INTERNAL_SERVICE_TOKEN` must be identical** on both the frontend and backend.
   If they differ, avatar generation will fail with 401 errors.

5. **Never commit `.env.local` or `backend/.env`** to git. Both files are in `.gitignore`.
   Use the `.example` files as templates.

---

## Frontend Environment Variables

Location: `frontend/.env.local`
Reference: `frontend/.env.local.example`

### Supabase

| Variable | Service | Required | Type | Example | Notes |
|----------|---------|----------|------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Required | URL | `https://abcd1234.supabase.co` | **Exposed to client bundle** — safe; this is a public project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Required | JWT string | `eyJhbGciOiJIUzI1NiIs...` | **Exposed to client bundle** — this is the public anon key; RLS protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Required | JWT string | `eyJhbGciOiJIUzI1NiIs...` | **NEVER expose to client.** Bypasses all RLS. Server-only. |

### Virtual Try-On

| Variable | Service | Required | Type | Example | Notes |
|----------|---------|----------|------|---------|-------|
| `TNB_API_KEY` | TheNewBlack AI | Required | Opaque string | `tnb_live_abc123xyz...` | Server-only. Sent as `X-API-Key` header (post Phase 2 fix). |
| `NEWBLACK_API_KEY` | TheNewBlack AI | Optional | Opaque string | Same format as above | Fallback alias for `TNB_API_KEY`. Use one or the other, not both. |

### AI Image Generation

| Variable | Service | Required | Type | Example | Notes |
|----------|---------|----------|------|---------|-------|
| `OPENAI_API_KEY` | OpenAI | Required | `sk-...` string | `sk-proj-abc123...` | Required for GPT-4o-mini prompt enrichment and DALL-E 3 fallback. Server-only. |
| `SEEDREAM_API_KEY` | BytePlus Ark (Seedream) | Required | Opaque string | `eyJhbGci...` | Primary design image generation. Falls back to DALL-E if missing. |
| `BYTEDANCE_API_KEY` | BytePlus Ark | Optional | Opaque string | Same format | Alias for `SEEDREAM_API_KEY`. Checked if `SEEDREAM_API_KEY` is absent. |
| `SEEDREAM_ENDPOINT` | BytePlus Ark | Optional | URL | `https://ark.ap-southeast.bytepluses.com/api/v3/images/generations` | Defaults to the BytePlus Ark endpoint if unset. |
| `SEEDREAM_MODEL` | BytePlus Ark | Optional | String | `seedream-4-0-250828` | Model ID. Defaults to `seedream-4-0-250828`. |
| `BLACKBOX_API_KEY` | BlackBox AI | Required | Opaque string | `blk_abc123...` | Required for model-gen and video-gen studio routes. Server-only. |
| `ANAKIN_API_KEY` | Anakin AI | Required | Opaque string | `ank_abc123...` | Required for trends search route. Server-only. |

### 3D Asset Generation

| Variable | Service | Required | Type | Example | Notes |
|----------|---------|----------|------|---------|-------|
| `MESHY_API_KEY` | Meshy AI | Required | Opaque string | `msy_abc123...` | Required for 3D garment mesh generation. Server-only. |

### Cloudflare R2 Storage

| Variable | Service | Required | Type | Example | Notes |
|----------|---------|----------|------|---------|-------|
| `R2_ACCOUNT_ID` | Cloudflare R2 | Optional* | 32-char hex | `a1b2c3d4e5f6...` | *Required for R2 storage. Falls back to Supabase Storage if unset. Server-only. |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 | Optional* | Opaque string | `abc123...` | S3-compatible access key ID. Server-only. |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 | Optional* | Opaque string | `xyz789...` | **NEVER expose to client.** HMAC signing key. Server-only. |
| `R2_PUBLIC_URL` | Cloudflare R2 | Optional* | URL | `https://pub-abc.r2.dev` | Public CDN base URL for served assets. Safe to embed in responses. |
| `R2_BUCKET_NAME` | Cloudflare R2 | Optional | String | `vexa-assets` | Defaults to `vexa-assets` if unset. |

### Email & Calendar (Bookings)

| Variable | Service | Required | Type | Example | Notes |
|----------|---------|----------|------|---------|-------|
| `RESEND_API_KEY` | Resend | Required | `re_...` string | `re_abc123...` | Required for booking confirmation emails. Server-only. |
| `GOOGLE_CLIENT_EMAIL` | Google Cloud | Required | Email address | `vexa-bot@my-project.iam.gserviceaccount.com` | Service account email for Google Calendar. Server-only. |
| `GOOGLE_PRIVATE_KEY` | Google Cloud | Required | PEM private key | `-----BEGIN PRIVATE KEY-----\nMIIE...` | Multi-line PEM key. In Vercel, paste with literal `\n` characters. Server-only. |
| `GOOGLE_CALENDAR_ID` | Google Calendar | Required | Calendar ID | `c_abc123@group.calendar.google.com` or `primary` | The calendar to create booking events in. Server-only. |

### Admin & Internal Security

| Variable | Service | Required | Type | Example | Notes |
|----------|---------|----------|------|---------|-------|
| `VEXA_ADMIN_KEY` | VEXA admin | Required | Random string | `vxa_adm_a1b2c3d4e5f6...` | Minimum 32 characters. Required for key generation and dashboard endpoints. Server-only. |
| `INTERNAL_SERVICE_TOKEN` | VEXA internal | Required | Random string | `a1b2c3d4...` (64 hex chars) | **Must match `INTERNAL_SERVICE_TOKEN` in `backend/.env` exactly.** Used for Next.js → Python auth and webhook verification. Server-only. |

### Backend Service URLs

| Variable | Service | Required | Type | Example | Notes |
|----------|---------|----------|------|---------|-------|
| `AVATAR_SERVICE_URL` | Python backend | Optional | URL | `https://vexa-backend.fly.dev` | URL of Python FastAPI service. If unset, avatar generation returns placeholder GLB. Server-only. |
| `PYTHON_SERVICE_URL` | Python backend | Optional | URL | Same as `AVATAR_SERVICE_URL` | Alias used in some routes. Set same value as `AVATAR_SERVICE_URL`. |

### Analytics (Public)

| Variable | Service | Required | Type | Example | Notes |
|----------|---------|----------|------|---------|-------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 | Optional | `G-...` string | `G-ABCDEF1234` | **Exposed to client bundle** — safe; GA measurement ID is public by design. |

---

## Backend Environment Variables

Location: `backend/.env`
Reference: `backend/.env.example`

| Variable | Service | Required | Type | Example | Notes |
|----------|---------|----------|------|---------|-------|
| `INTERNAL_SERVICE_TOKEN` | VEXA internal | Required | Random string | `a1b2c3d4...` (64 hex chars) | **Must match `INTERNAL_SERVICE_TOKEN` in `frontend/.env.local` exactly.** If absent or wrong, all Next.js → Python calls fail. **If unset in production, the service now exits at startup (Phase 3 fix).** |
| `NEXT_PUBLIC_APP_URL` | VEXA frontend | Required | URL | `https://your-domain.vercel.app` | Frontend origin for CORS and for constructing avatar callback URLs. |
| `R2_ENDPOINT` | Cloudflare R2 | Required | URL | `https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com` | S3-compatible endpoint. Required for `generate-avatar-full` to upload GLB files. |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 | Required | Opaque string | `abc123...` | S3-compatible access key ID for Python → R2 uploads via boto3. |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 | Required | Opaque string | `xyz789...` | S3-compatible secret key. Never log. |
| `R2_BUCKET_NAME` | Cloudflare R2 | Required | String | `vexa-assets` | Target R2 bucket. Must match the bucket used by the frontend. |
| `R2_PUBLIC_URL` | Cloudflare R2 | Required | URL | `https://pub-abc.r2.dev` | Public CDN URL prefix for uploaded avatars. Returned to callers after upload. |
| `SMPLX_MODEL_PATH` | SMPL-X | Required | File path | `/app/models/smplx` or `/home/user/smplx_models` | Path to SMPL-X model weight files (`.npz` / `.pkl`). Required for full avatar pipeline. |
| `ENVIRONMENT` | Runtime | Optional | Enum | `production` or `development` | When `development`, the `INTERNAL_SERVICE_TOKEN` missing check logs a warning instead of exiting. Defaults to `production`. |
| `HF_IDM_VTON_URL` | Hugging Face | Optional | URL | `https://api-inference.huggingface.co/models/yisol/IDM-VTON` | Override URL for IDM-VTON inference. Defaults to the HuggingFace Inference API endpoint. |

---

## Required vs Optional Summary

### Frontend — Minimum to Run (Core Try-On Working)

```
NEXT_PUBLIC_SUPABASE_URL      ← required
NEXT_PUBLIC_SUPABASE_ANON_KEY ← required
SUPABASE_SERVICE_ROLE_KEY     ← required
TNB_API_KEY                   ← required
OPENAI_API_KEY                ← required
VEXA_ADMIN_KEY                ← required
INTERNAL_SERVICE_TOKEN        ← required (if Python service is deployed)
```

### Frontend — Full Feature Set

All variables above plus:

```
SEEDREAM_API_KEY              ← design studio
BLACKBOX_API_KEY              ← model-gen + video-gen studio
MESHY_API_KEY                 ← 3D garment generation
ANAKIN_API_KEY                ← trends search
R2_ACCOUNT_ID                 ← R2 storage (else falls back to Supabase Storage)
R2_ACCESS_KEY_ID              ←
R2_SECRET_ACCESS_KEY          ←
R2_PUBLIC_URL                 ←
RESEND_API_KEY                ← booking emails
GOOGLE_CLIENT_EMAIL           ← booking calendar
GOOGLE_PRIVATE_KEY            ←
GOOGLE_CALENDAR_ID            ←
AVATAR_SERVICE_URL            ← Python avatar service URL
```

### Backend — Minimum to Start

```
INTERNAL_SERVICE_TOKEN        ← required (exits at startup if missing in production)
NEXT_PUBLIC_APP_URL           ← required for CORS
SMPLX_MODEL_PATH              ← required for full avatar; service starts without it but avatar generation fails
```

### Backend — Full R2 Upload Working

```
R2_ENDPOINT                   ← required
R2_ACCESS_KEY_ID              ←
R2_SECRET_ACCESS_KEY          ←
R2_BUCKET_NAME                ←
R2_PUBLIC_URL                 ←
```

---

## Env Var Naming Conventions

| Prefix | Meaning |
|--------|---------|
| `NEXT_PUBLIC_` | Embedded in client JS bundle. Safe for public identifiers only. Never secrets. |
| `SUPABASE_SERVICE_ROLE_KEY` | Root-level database access. NEVER expose to client. |
| `R2_SECRET_*` | Write credentials for object storage. NEVER expose to client. |
| `*_PRIVATE_KEY` | Private signing key. NEVER expose to client or log. |
| `VEXA_ADMIN_KEY` | Admin access gate. Treat as a root password. |
| `INTERNAL_SERVICE_TOKEN` | Internal service auth. Must match between frontend and backend. |

---

*Environment variable reference: 2026-05-13 | Phase 8 documentation pass*
