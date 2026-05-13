# VEXA Infrastructure Architecture

**Document Date:** 2026-05-13
**System:** VEXA — AI Virtual Try-On & Avatar Platform
**Version:** Post Phase 7 security hardening

---

## System Overview

```
                         ┌──────────────────────────────────┐
                         │     Browser / Marketplace Embed   │
                         │  React 19 + Zustand client state  │
                         │  /studio, /onboarding, /embed,    │
                         │  /dashboard, /products, /ar        │
                         └────────────────┬─────────────────┘
                                          │ HTTPS (fetch)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Vercel Edge / Node.js Runtime                          │
│                  Next.js 15 — App Router + API Routes                       │
│                                                                             │
│  middleware.ts ── x-vexa-key validation ── usage_logs insert                │
│                                                                             │
│  /api/tryon          /api/upload        /api/avatar/generate                │
│  /api/studio/*       /api/keys/*        /api/auth/*                         │
│  /api/dashboard/*    /api/bookings      /api/proxy                          │
│  /api/clothing/*     /api/webhook/*     /api/tryon/batch                    │
│                                                                             │
│  src/lib/apiKeyMiddleware.ts  ── SHA-256 key validation                     │
│  src/lib/ipRateLimit.ts       ── per-IP 24h rate limits                     │
│  src/lib/r2.ts                ── Cloudflare R2 uploads                      │
│  src/lib/fitEngine.ts         ── garment fit calculations                   │
└──────────┬───────────────────────────┬─────────────────────────────────────┘
           │                           │                           │
           ▼                           ▼                           ▼
┌──────────────────┐      ┌────────────────────────┐   ┌──────────────────────┐
│    Supabase      │      │   TheNewBlack (TNB) AI  │   │  Python Avatar       │
│  (Hosted PG +   │      │  thenewblack.ai         │   │  Service (FastAPI)   │
│   Auth +        │      │  /api/1.1/wf/vto_stream │   │  backend/main.py     │
│   Storage)      │      │  Garment-on-model        │   │  /generate-avatar    │
│                 │      │  try-on rendering        │   │  /generate-avatar-full│
│  Tables:        │      └────────────────────────┘   │  /health             │
│  users          │                                    └──────────┬───────────┘
│  api_keys       │      ┌────────────────────────┐              │
│  tryon_results  │      │    OpenAI API           │              ▼
│  clothing_assets│      │  GPT-4o-mini (prompts)  │   ┌──────────────────────┐
│  video_jobs     │      │  DALL-E 3 (images)      │   │  SMPL-X ML Pipeline  │
│  usage_logs     │      └────────────────────────┘   │  pipeline/           │
│  admin_logs     │                                    │  body_generator.py   │
│  bookings       │      ┌────────────────────────┐   │  face_texture.py     │
│  ip_usage_limits│      │  BytePlus Ark / Seedream│   │  archetype_selector.py│
│  avatars        │      │  Primary design images  │   └──────────┬───────────┘
│  design_history │      └────────────────────────┘              │
└──────────┬──────┘                                              │
           │              ┌────────────────────────┐             │
           │              │  BlackBox AI            │             ▼
           └──────────┐   │  model-gen / video-gen  │   ┌──────────────────────┐
                      │   └────────────────────────┘   │  Cloudflare R2       │
                      │                                 │  Object Storage      │
                      │   ┌────────────────────────┐   │  Bucket: vexa-assets │
                      │   │  Meshy AI               │   │                      │
                      │   │  Image-to-3D garment    │   │  /studio/tryons/     │
                      │   │  mesh (GLB) generation  │   │  /avatars/           │
                      │   └────────────────────────┘   │  /design_results/    │
                      │                                 │  /studio/uploads/    │
                      │   ┌────────────────────────┐   └──────────────────────┘
                      │   │  Anakin AI              │
                      │   │  Fashion trend search   │
                      │   └────────────────────────┘
                      │
                      │   ┌────────────────────────┐
                      │   │  Resend                 │
                      └───│  Transactional email    │
                          └────────────────────────┘
                          ┌────────────────────────┐
                          │  Google Calendar API    │
                          │  Booking slot mgmt      │
                          └────────────────────────┘
```

---

## Component Descriptions

| Service | Technology | Purpose | Auth Mechanism |
|---------|-----------|---------|----------------|
| Browser SPA | React 19, Zustand, Tailwind CSS, Three.js | End-user UI — studio, onboarding, dashboard, AR viewer, embed widget | Supabase JWT (client-side session) |
| Next.js BFF | Next.js 15, Node.js 20, TypeScript 5 | All API routes, server-side orchestration, AI call fanout, auth enforcement | `x-vexa-key` (B2B) or Supabase Bearer (end-user) |
| Vercel hosting | Vercel Edge Network | CDN, TLS termination, static asset delivery, serverless function execution | Vercel API tokens (deploy only) |
| Supabase | Hosted PostgreSQL 15, Supabase Auth, Supabase Storage | Primary data store — users, API keys, try-on results, usage logs, auth tokens | `SUPABASE_SERVICE_ROLE_KEY` (server), anon key (client/limited) |
| Python Avatar Service | FastAPI 0.129, Python 3.10+, Uvicorn | Heavy ML compute — SMPL-X body mesh generation, face texture extraction, avatar GLB export | `INTERNAL_SERVICE_TOKEN` Bearer header |
| SMPL-X Pipeline | PyTorch, smplx 0.1.28, trimesh 4.11.5, mediapipe | 3D avatar body generation from anthropometric measurements | Internal (no network auth — called directly by Python service) |
| Cloudflare R2 | S3-compatible object storage | Persistent asset storage — try-on images, avatar GLB files, design results | HMAC-signed S3 API (`R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY`) |
| TheNewBlack AI | External REST API | Garment-on-model virtual try-on image rendering | `X-API-Key` header (post Phase 2 fix; was query param) |
| OpenAI | External REST API | GPT-4o-mini prompt enrichment + DALL-E 3 fallback image generation | `Authorization: Bearer` header |
| BytePlus Ark (Seedream) | External REST API | Primary AI fashion design image generation | `Authorization: Bearer` header |
| BlackBox AI | External REST API | Model image generation + video generation | `Authorization: Bearer` header |
| Meshy AI | External REST API | Image-to-3D GLB garment mesh generation (async task pattern) | `Authorization: Bearer` header |
| Anakin AI | External REST API | Fashion trend web search results | `X-API-Key` header |
| Resend | External transactional email | Booking confirmation emails | `Authorization: Bearer` header |
| Google Calendar API | Google Cloud REST API | Demo booking slot management | Service account (`GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`) |
| Hugging Face Inference | External REST API | IDM-VTON video frame try-on (frame-by-frame, backend only) | `Authorization: Bearer <hf_key>` |

---

## Data Flow Descriptions

### B2B Marketplace Try-On Request Flow

```
Marketplace Embed iframe (/embed?productId=X&productImageUrl=Y&marketplaceKey=Z)
    │
    ├── GET /api/keys/validate (key present check)
    │       └── Supabase: SELECT from api_keys WHERE hash = SHA256(key)
    │
    ├── POST /api/tryon
    │       ├── middleware.ts: x-vexa-key validation → usage_logs upsert
    │       ├── ipRateLimit: check ip_usage_limits (B2B clients bypass IP limit)
    │       ├── apiKeyMiddleware: validateApiKey() → returns MarketplaceContext
    │       ├── resolveToPublicUrl(): base64/blob → R2/Supabase Storage URL
    │       ├── callTNB(): POST to thenewblack.ai/api/1.1/wf/vto_stream
    │       │       └── Tail hedging: 2 parallel requests, 3s offset; first valid wins
    │       ├── persistResultImage(): R2 upload (fallback: Supabase Storage)
    │       ├── Supabase: upsert tryon_results row
    │       ├── incrementIpCount(): atomic RPC increment
    │       └── If webhookUrl set: POST result to marketplace callback URL
    │
    └── Embed UI: display result image in iframe
```

### End-User Avatar Generation Flow

```
/onboarding page (5-step wizard)
    │
    ├── Step 1–4: Face photo capture + body measurements input
    │
    └── Step 5: POST /api/avatar/generate
            ├── Supabase: verify Bearer JWT → getUser()
            ├── IDOR check: userId from body must match authenticated user
            ├── If AVATAR_SERVICE_URL unset → return placeholder /models/avatar.glb
            └── POST to {AVATAR_SERVICE_URL}/generate-avatar (INTERNAL_SERVICE_TOKEN)
                    ├── Python: measurements_to_betas() → 10-dim SMPL-X shape vector
                    ├── Python: generate_body_mesh() → trimesh GLB
                    ├── Python: extract_face_texture() → face region embed
                    ├── Python: upload_to_r2() → R2 public URL
                    └── Webhook: POST /api/webhook/avatar-ready { userId, avatarUrl }
                            └── Supabase: UPDATE users SET avatar_url = avatarUrl
```

### Upload Flow

```
User selects file in Studio UI
    │
    └── POST /api/upload (multipart/form-data)
            ├── Auth: Supabase Bearer token OR x-vexa-key (required)
            ├── Size check: max 10 MB
            ├── Magic byte validation: inspect first bytes for image signature
            │       (PNG: 89504E47, JPEG: FFD8FF, WebP: 52494646, GIF: 47494638)
            │       Reject if magic bytes do not match any allowed format
            ├── EXIF strip: remove metadata before storage
            ├── Upload to Cloudflare R2 (fallback: Supabase Storage)
            └── Return { url: publicR2Url }
```

---

## Security Boundaries

| Boundary | Protected By | What It Guards |
|----------|-------------|----------------|
| Public internet → Next.js API routes | Vercel TLS + `x-vexa-key` / Supabase JWT | All API endpoints require identity |
| Next.js → Python service | `INTERNAL_SERVICE_TOKEN` Bearer + HMAC webhook signature | Avatar generation and webhook callbacks |
| Next.js → Supabase | `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to client) | Privileged DB writes; bypasses RLS |
| Browser → Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` + Supabase RLS policies | Client-side DB reads; RLS limits row visibility |
| Next.js → R2 | HMAC-signed S3 API requests | Asset upload/delete operations |
| Next.js → AI APIs | Per-service API keys in server env vars | Paid API quota protection |
| Image proxy | URL allowlist + scheme check + RFC-1918 block | SSRF prevention (Phase 1 fix) |
| Admin routes | `VEXA_ADMIN_KEY` header check | Key generation, dashboard stats, analytics |

---

## Network Topology

### Public (Internet-facing)

| Endpoint | URL | Notes |
|----------|-----|-------|
| Next.js app | `https://[your-domain].vercel.app` | Vercel CDN with TLS |
| All `/api/*` routes | Same domain via Vercel serverless functions | Rate limited; auth required on protected routes |
| Embed widget | `/embed` page | Publicly embeddable iframe |
| R2 public assets | `https://[R2_PUBLIC_URL]/...` | Read-only CDN; no auth required for read |

### Internal (Not Publicly Routable)

| Component | Access Pattern | Notes |
|-----------|---------------|-------|
| Python avatar service | `http://[AVATAR_SERVICE_URL]` — only from Next.js server functions | Not exposed to internet; protected by `INTERNAL_SERVICE_TOKEN` |
| Supabase service role | Next.js server env only | `SUPABASE_SERVICE_ROLE_KEY` never in client bundle |
| R2 write credentials | Next.js server env only | `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` never in client bundle |
| AI API keys | Next.js server env only | `TNB_API_KEY`, `OPENAI_API_KEY`, etc. never in client bundle |

### Deployment Topology (Production)

```
[Cloudflare CDN / WAF]
        │ HTTPS
        ▼
[Vercel Edge Network]
        │ routes to serverless functions
        ▼
[Next.js serverless functions] ──── [Supabase hosted PG + Auth]
        │
        ├── [External AI APIs] (TNB, OpenAI, Seedream, BlackBox, Meshy, Anakin)
        │
        ├── [Cloudflare R2 storage]
        │
        └── [Python Avatar Service] (Railway / Fly.io / self-hosted)
                    │
                    └── [Cloudflare R2 storage] (direct write from Python)
```

---

*Infrastructure architecture: 2026-05-13 | Phase 8 documentation pass*
