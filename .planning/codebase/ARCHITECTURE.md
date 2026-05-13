<!-- refreshed: 2026-05-13 -->
# Architecture

**Analysis Date:** 2026-05-13

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Browser / Marketplace Embed                             │
│  React + Zustand (`frontend/src/store/useStore.ts`)                         │
│  Pages: /studio, /onboarding, /dashboard, /embed, /products                │
└──────────────────┬──────────────────────────────────────────────────────────┘
                   │  fetch() from client
                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              Next.js App Router — API Layer (Node.js runtime)               │
│  `frontend/src/app/api/**`                                                   │
│                                                                             │
│  Middleware:  `frontend/middleware.ts`  — x-vexa-key validation + logging   │
│  Auth helper: `frontend/src/lib/apiKeyMiddleware.ts`                        │
│  Rate limit:  `frontend/src/lib/ipRateLimit.ts`                             │
└──────┬──────────────────────────────┬────────────────────────────┬──────────┘
       │                              │                            │
       ▼                              ▼                            ▼
┌─────────────┐            ┌──────────────────┐       ┌───────────────────────┐
│  Supabase   │            │ The New Black AI  │       │ Python Avatar Service │
│  (Auth +    │            │ (TNB) vto_stream  │       │ `backend/main.py`     │
│   Postgres  │            │  /api/tryon       │       │  /generate-avatar     │
│   Storage)  │            │  TNB hedging)     │       │  /generate-avatar-full│
└──────┬──────┘            └──────────────────┘       └──────────┬────────────┘
       │                                                          │
       ▼                                                          ▼
┌───────────────────────────────────────────┐       ┌────────────────────────┐
│  Cloudflare R2 / Supabase Storage         │       │ SMPL-X Pipeline        │
│  `frontend/src/lib/r2.ts`                 │       │ `backend/pipeline/`    │
│  `backend/pipeline/r2_uploader.py`        │       │  body_generator.py     │
│  Buckets: avatars, studio/tryons,         │       │  face_texture.py       │
│           design_results, studio/uploads  │       │  archetype_selector.py │
└───────────────────────────────────────────┘       └────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Next.js Middleware | Validate `x-vexa-key`, log usage to `usage_logs` table | `frontend/middleware.ts` |
| API Key Middleware | Validate key, return `MarketplaceContext`, wrap route handlers | `frontend/src/lib/apiKeyMiddleware.ts` |
| IP Rate Limiter | 2 try-ons / 3 designs per IP per 24h (via `ip_usage_limits` table) | `frontend/src/lib/ipRateLimit.ts` |
| Try-On Route | Auth, image resolution, TNB hedging, persistence | `frontend/src/app/api/tryon/route.ts` |
| Studio Page | Primary UI — image upload, category select, try-on trigger | `frontend/src/app/studio/page.tsx` |
| Avatar Generate Route | Forward to Python service or return placeholder GLB | `frontend/src/app/api/avatar/generate/route.ts` |
| Python Avatar Service | FastAPI — generate-avatar, generate-avatar-full, health | `backend/main.py` |
| SMPL-X Pipeline | Measurements → betas → GLB mesh via smplx + trimesh | `backend/pipeline/body_generator.py` |
| Face Texture Extractor | Extract face region from photo and embed in mesh texture | `backend/pipeline/face_texture.py` |
| R2 Uploader (TS) | Upload Buffer to Cloudflare R2; graceful no-op when unconfigured | `frontend/src/lib/r2.ts` |
| R2 Uploader (Python) | Upload local file path to Cloudflare R2 via boto3 | `backend/pipeline/r2_uploader.py` |
| Fit Engine | Derive fit label + recommended size from user measurements vs. size chart | `frontend/src/lib/fitEngine.ts` |
| Zustand Store | Client-side app state: userImage, currentUser, tryOnResult, favorites | `frontend/src/store/useStore.ts` |
| Embed Page | Iframe-embeddable try-on widget for marketplace integrations | `frontend/src/app/embed/page.tsx` |
| Dashboard Page | Admin view — API key management, usage analytics | `frontend/src/app/dashboard/page.tsx` |

## Pattern Overview

**Overall:** B2B API-first SaaS with co-located Next.js BFF

**Key Characteristics:**
- Next.js API routes act as the sole BFF — browsers never call the Python service directly
- Two auth paths: B2B marketplace clients send `x-vexa-key`; end users send Supabase Bearer tokens
- Demo/guest mode always available: no key required for unauthenticated requests (IP rate-limited)
- Tail hedging on critical AI path: two parallel TNB requests after a 3s offset; first valid result wins
- Storage dual-write: Cloudflare R2 is primary, Supabase Storage is fallback (transparent to callers)

## Layers

**Presentation Layer:**
- Purpose: React pages and reusable UI components
- Location: `frontend/src/app/` (pages), `frontend/src/components/` (shared), `frontend/src/app/components/` (page-scoped landing sections)
- Contains: Server components, client components (`"use client"`), layout wrappers
- Depends on: Store, hooks, lib utilities
- Used by: End users and marketplace embed iframes

**BFF / API Layer:**
- Purpose: All server-side logic, auth enforcement, AI orchestration, persistence
- Location: `frontend/src/app/api/`
- Contains: Next.js Route Handlers (one `route.ts` per endpoint folder)
- Depends on: `frontend/src/lib/`, Supabase, TNB AI API, Python service
- Used by: Presentation layer and external B2B clients via `x-vexa-key`

**Client State Layer:**
- Purpose: Cross-component reactive state
- Location: `frontend/src/store/useStore.ts`
- Contains: Single Zustand store (`AppState`) — user image, selected outfit, try-on result, auth user, favorites
- Depends on: Type definitions in `frontend/src/types/`
- Used by: All client components that need shared state

**Service / Lib Layer:**
- Purpose: Stateless utility functions called by API routes
- Location: `frontend/src/lib/`
- Contains: `apiKeyMiddleware.ts`, `ipRateLimit.ts`, `r2.ts`, `fitEngine.ts`, `crypto.ts`, `supabase.ts`, `rateLimit.ts`
- Depends on: Supabase client, AWS SDK (R2), environment variables
- Used by: API layer only (server-side)

**Python Service:**
- Purpose: Heavy ML workloads — 3D avatar generation, video frame processing
- Location: `backend/`
- Contains: FastAPI app (`main.py`), pipeline modules (`pipeline/`)
- Depends on: smplx, trimesh, torch, mediapipe, boto3
- Used by: Next.js API routes via `AVATAR_SERVICE_URL` env var

## Data Flow

### Primary Try-On Request (Image)

1. User uploads photo + garment image in Studio UI (`frontend/src/app/studio/page.tsx`)
2. `fetch('/api/tryon', { method: 'POST', body: { userId, userPhotoUrl, productImageUrl, category } })`
3. `frontend/middleware.ts` — validates `x-vexa-key` if present; logs to `usage_logs`; passes demo requests through
4. `POST /api/tryon` (`frontend/src/app/api/tryon/route.ts`) — entry
5. IP rate limit check via `checkIpLimit(clientIp, 'tryon')` → `ip_usage_limits` table
6. `authenticateRequest()` — tries marketplace key → Supabase Bearer → guest upsert
7. `resolveToPublicUrl()` — converts base64 / blob URLs to stable R2/Supabase Storage URLs
8. `callTNB()` — sends to `https://thenewblack.ai/api/1.1/wf/vto_stream` with tail hedging
9. `persistResultImage()` — downloads result and uploads to R2 (fallback: Supabase Storage)
10. Upsert row in `tryon_results` table
11. `incrementIpCount()` — records successful usage
12. Return `{ resultUrl, status, fitLabel, recommendedSize, fitScore, generationsRemaining }`

### Avatar Generation Flow

1. Onboarding wizard (`frontend/src/app/onboarding/page.tsx`) — user captures face photo and enters measurements
2. `POST /api/avatar/generate` (`frontend/src/app/api/avatar/generate/route.ts`)
3. Supabase Bearer token validated; `userId` must match authenticated user (IDOR check)
4. If `AVATAR_SERVICE_URL` unset → return placeholder GLB at `/models/avatar.glb`
5. Otherwise forward to `{AVATAR_SERVICE_URL}/generate-avatar` with `INTERNAL_SERVICE_TOKEN`
6. Python service (`backend/main.py`) returns `{ avatar_url, status: 'ready' }`
7. Update `users.avatar_url` in Supabase
8. Return `{ avatarUrl, status: 'ready' }` to client

### Full SMPL-X Avatar Pipeline (backend-only, heavy)

1. `/generate-avatar-full` (`backend/main.py`)
2. `measurements_to_betas()` → 10-dim SMPL-X shape vector (`backend/pipeline/body_generator.py`)
3. `generate_body_mesh()` → trimesh GLB with cylindrical UV unwrap
4. `extract_face_texture()` → face region from photo (`backend/pipeline/face_texture.py`)
5. Embed texture into mesh material
6. Export to GLB → `upload_to_r2()` (`backend/pipeline/r2_uploader.py`)
7. Return `{ avatar_url, status: 'success', archetypes }`

### AI Design Generation Flow

1. `POST /api/studio/design` (`frontend/src/app/api/studio/design/route.ts`)
2. IP rate limit check (3/24h for design)
3. GPT-4o-mini prompt enrichment via OpenAI Chat API
4. Seedream (BytePlus Ark) image generation (primary); DALL-E 3 as fallback
5. Async persistence: R2 → Supabase Storage → insert into `design_history`
6. Return `{ designImageUrl, prompt }`

### B2B Embed Widget Flow

1. Marketplace embeds `<iframe src="/embed?productId=X&productImageUrl=Y&marketplaceKey=Z">`
2. `frontend/src/app/embed/page.tsx` — validates key via `GET /api/keys/validate`
3. Calls `POST /api/tryon` with `x-vexa-key` header (bypasses IP rate limit)
4. Displays result in-iframe

**State Management:**
- Server state: Supabase (single source of truth for users, results, keys, usage)
- Client state: Zustand store (`frontend/src/store/useStore.ts`) — volatile session-scoped state only
- No Redux, no React Context used for global state

## Key Abstractions

**MarketplaceContext:**
- Purpose: Represents an authenticated B2B API client
- Examples: `frontend/src/types/index.ts`, `frontend/src/lib/apiKeyMiddleware.ts`
- Pattern: Returned by `validateApiKey()` when `x-vexa-key` header is valid and SHA-256 hash matches `api_keys` table

**TryOnResult:**
- Purpose: Unified shape for all try-on response data
- Examples: `frontend/src/types/index.ts`, `frontend/src/store/useStore.ts`
- Pattern: Contains `resultUrl`, `fitLabel`, `recommendedSize`, `fitScore`, `generationsRemaining`, `status`

**Database Type Definitions:**
- Purpose: Typed Supabase client — eliminates `any` on DB queries
- Examples: `frontend/src/types/database.ts`
- Pattern: `Database` interface with `Tables` map used as generic parameter in `createClient<Database>()`

**handleTryOn (exported function):**
- Purpose: Reusable try-on orchestration callable from both the main route and sub-routes
- Examples: `frontend/src/app/api/tryon/route.ts`
- Pattern: Exported named function, not just the route handler; allows `[productId]/route.ts` to reuse logic

## Entry Points

**Web Application:**
- Location: `frontend/src/app/layout.tsx`
- Triggers: Browser page load
- Responsibilities: Fonts, metadata, GlobalLayout wrapper, Vercel Analytics, Google Analytics

**API Entry Point:**
- Location: `frontend/middleware.ts`
- Triggers: Every request matching `/api/:path*`
- Responsibilities: `x-vexa-key` validation, call count increment, `usage_logs` insert; passes through unauthenticated requests for demo mode

**Python Service Entry Point:**
- Location: `backend/main.py`
- Triggers: `uvicorn backend.main:app` (or `python -m uvicorn ...`)
- Responsibilities: CORS, bearer token auth, avatar and try-on route handlers

**Studio (Primary User Entry):**
- Location: `frontend/src/app/studio/page.tsx`
- Triggers: User navigates to `/studio` (or redirect from `/virtual-try-on`)
- Responsibilities: Upload UI, category selection, multi-garment management, try-on trigger, result display

**Onboarding Entry:**
- Location: `frontend/src/app/onboarding/page.tsx`
- Triggers: `OnboardingGuard` redirects users without `avatar_url` to `/onboarding`
- Responsibilities: 5-step wizard — face photo capture, measurement input, avatar generation

## Architectural Constraints

- **Threading:** Next.js API routes run in Node.js single-threaded event loop; long TNB calls use `AbortSignal.timeout(120_000)` to prevent stalls; Python service is async FastAPI with asyncio
- **Global state:** `frontend/src/lib/supabase.ts` creates one module-level client with anon key; API routes always create fresh service-role clients to avoid credential leakage
- **Internal token:** Python service protected by `INTERNAL_SERVICE_TOKEN` bearer header; same token used by webhook callback route (`/api/webhook/avatar-ready`)
- **Rate limiting:** Two independent mechanisms — Next.js middleware (per API key call_count / monthly_limit) and IP-based limiter (per endpoint type per 24h)
- **No circular imports:** `lib/` is consumed by `app/api/`; pages consume `lib/` only through hooks; hooks import from `lib/` but not from `app/api/`

## Anti-Patterns

### Direct Supabase Client Creation in Every Route

**What happens:** Every API route calls `createClient()` inline with the same env var read pattern rather than importing a shared factory.
**Why it's wrong:** `SUPABASE_SERVICE_ROLE_KEY` vs `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback logic is duplicated across `tryon/route.ts`, `avatar/generate/route.ts`, `studio/design/route.ts`, `middleware.ts`, and others.
**Do this instead:** Add a `getServiceSupabase()` export to `frontend/src/lib/supabase.ts` alongside the existing anon client.

### `any` Type Escape Hatch on Supabase Upsert

**What happens:** `(supabase.from('tryon_results') as any).upsert(...)` in `frontend/src/app/api/tryon/route.ts` line 256.
**Why it's wrong:** Bypasses `Database` type safety; breaks autocomplete; schema changes go undetected at compile time.
**Do this instead:** Add `tryon_results` insert types to `Database` in `frontend/src/types/database.ts` and remove the cast.

### Hardcoded Fit Values Returned Without Calculation

**What happens:** `/api/tryon/route.ts` always returns `fitLabel: 'True to size', recommendedSize: 'M', fitScore: 85` regardless of user measurements.
**Why it's wrong:** `fitEngine.ts` and size chart lookups exist but are unused in the hot path; the returned values are meaningless.
**Do this instead:** Query `size_charts` for the product and call `getFitRecommendation()` / `getFitScore()` inside `handleTryOn()`.

## Error Handling

**Strategy:** Catch-and-log at API route boundaries; never propagate stack traces to clients

**Patterns:**
- API routes wrap all logic in try/catch; return `NextResponse.json({ error: message }, { status: 5xx })`
- AI calls (TNB, Seedream, DALL-E) use nested try/catch with fallback to alternative provider
- Storage writes use try/catch that returns original URL on failure (never throw to caller)
- Python service raises `HTTPException` with structured detail string; unhandled exceptions logged via `logger.exception()`
- `AbortSignal.timeout()` used for all outbound AI/storage fetches — no hanging promises

## Cross-Cutting Concerns

**Logging:** `console.log/error/warn` throughout Next.js (no structured logger); Python uses `logging.getLogger("vexa")` with `logging.basicConfig(level=INFO)`
**Validation:** Manual type guards (`isLoginBody()`, `parseVideoBody()`) at route entry points; Pydantic models in Python service
**Authentication:** Three modes — B2B `x-vexa-key` (SHA-256 hashed, stored in `api_keys`), Supabase Bearer JWT, guest/demo (unauthenticated, IP-rate-limited)
**Image Persistence:** Always attempt R2 first; fall back to Supabase Storage; return original URL if both fail

---

*Architecture analysis: 2026-05-13*
