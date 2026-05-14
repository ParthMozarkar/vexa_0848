# VEXA Frontend — Architecture Map

**Generated:** 2026-05-14
**Project:** VEXA AI Virtual Try-On Platform
**Framework:** Next.js 15.1.11 / App Router / React 19

---

## System Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Browser / Marketplace Embed                             │
│  React 19 + Zustand  (frontend/src/store/)                                  │
│  Pages: /studio, /onboarding, /dashboard, /embed, /ar, /products           │
└──────────────────┬──────────────────────────────────────────────────────────┘
                   │  fetch() from client
                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              Next.js App Router — BFF / API Layer (Node.js)                 │
│  frontend/src/app/api/**  (route handlers)                                  │
│  frontend/middleware.ts   (x-vexa-key validation + usage logging)           │
└──────┬──────────────────────────────┬────────────────────────────┬──────────┘
       │                              │                            │
       ▼                              ▼                            ▼
┌─────────────┐            ┌──────────────────┐       ┌───────────────────────┐
│  Supabase   │            │ The New Black AI  │       │ Python Avatar Service │
│  Postgres + │            │ (TNB) vto_stream  │       │ FastAPI / Uvicorn     │
│  Auth +     │            │  /api/tryon       │       │  /generate-avatar     │
│  Storage    │            │  (tail-hedged)    │       │  /generate-avatar-full│
└──────┬──────┘            └──────────────────┘       └──────────┬────────────┘
       │                                                          │
       ▼                                                          ▼
┌───────────────────────────────────────────┐       ┌────────────────────────┐
│  Cloudflare R2 / Supabase Storage         │       │ SMPL-X Pipeline        │
│  Buckets: avatars, tryons, design_results │       │ backend/pipeline/      │
└───────────────────────────────────────────┘       └────────────────────────┘
```

---

## Directory Structure

```
frontend/src/
├── app/                         # Next.js App Router pages + API routes
│   ├── layout.tsx               # Root layout — fonts, metadata, analytics
│   ├── page.tsx                 # Homepage (marketing, Spline 3D hero)
│   ├── globals.css              # Tailwind base + custom CSS variables
│   ├── api/                     # Server-side route handlers (BFF layer)
│   │   ├── tryon/               # POST /api/tryon — AI try-on orchestration
│   │   ├── tryon/[productId]/   # POST /api/tryon/:productId — product-scoped
│   │   ├── upload/              # POST /api/upload — R2 presigned upload
│   │   ├── avatar/              # Avatar generation routes
│   │   │   └── generate/        # POST /api/avatar/generate
│   │   ├── studio/              # Studio feature routes
│   │   │   ├── design/          # POST /api/studio/design — AI design gen
│   │   │   └── trends/          # GET  /api/studio/trends — trend lookup
│   │   ├── auth/                # Auth routes
│   │   │   └── login/           # POST /api/auth/login
│   │   ├── keys/                # API key management
│   │   │   ├── generate/        # POST /api/keys/generate
│   │   │   └── validate/        # GET  /api/keys/validate
│   │   ├── bookings/            # POST /api/bookings — Google Calendar
│   │   ├── proxy/               # GET  /api/proxy — image proxy with auth
│   │   └── webhook/             # POST /api/webhook/avatar-ready
│   ├── studio/                  # Studio page (primary try-on UI)
│   │   └── page.tsx
│   ├── dashboard/               # Dashboard (API key mgmt, usage analytics)
│   │   └── page.tsx
│   ├── onboarding/              # Onboarding wizard (face capture, measurements)
│   │   └── page.tsx
│   ├── embed/                   # Iframe-embeddable try-on widget
│   │   └── page.tsx
│   ├── ar/                      # WebXR AR try-on page
│   │   └── page.tsx
│   ├── products/                # Product catalog pages
│   └── components/              # Page-scoped landing section components
│       ├── HeroSection.tsx
│       ├── FeaturesSection.tsx
│       └── ...
├── components/                  # Shared UI components (used across pages)
│   ├── AvatarViewer/            # R3F 3D avatar canvas (react-three/fiber)
│   │   └── index.tsx
│   ├── FaceCapture/             # Camera/webcam photo capture
│   │   └── index.tsx
│   ├── GlobalLayout.tsx         # Top-level layout wrapper (nav, footer)
│   ├── OnboardingGuard.tsx      # Redirect guard for avatar_url check
│   ├── studio/                  # Studio-specific components
│   │   ├── GarmentUploader.tsx
│   │   ├── TryOnResult.tsx
│   │   └── ...
│   └── ui/                      # Generic UI primitives
│       ├── LazyImage.tsx        # Progressive image with blur placeholder
│       ├── GlbLoadingIndicator.tsx  # Spinner for 3D asset loads
│       ├── Button.tsx
│       └── ...
├── features/                    # Feature barrel re-exports (Phase 15)
│   ├── tryon/                   # Try-on domain barrel
│   │   └── index.ts             # Re-exports types, hooks, components
│   ├── avatar/                  # Avatar domain barrel
│   │   └── index.ts
│   ├── auth/                    # Auth utilities barrel
│   │   └── index.ts
│   ├── studio/                  # Studio components barrel
│   │   └── index.ts
│   └── dashboard/               # Dashboard state barrel
│       └── index.ts
├── hooks/                       # React hooks
│   ├── useTryOn.ts              # Try-on state machine (upload → submit → result)
│   ├── useUser.ts               # Auth user + measurements from Supabase
│   ├── useDeviceCapability.ts   # Mobile capability detection (Phase 16)
│   │                            #   isMobile, gpuTier, prefersReducedMotion
│   ├── useProgressiveGlb.ts     # Progressive 3D model loading (Phase 17)
│   │                            #   low-poly placeholder → full mesh swap
│   └── useApiCall.ts            # Typed API call hook with loading/error state
├── lib/                         # Server + client utilities
│   ├── apiClient.ts             # Centralized typed API client (Phase 18)
│   │                            #   api.tryOn(), api.uploadImage(), etc.
│   ├── apiKeyMiddleware.ts      # validateApiKey(), requireApiKey() HOF
│   ├── ipRateLimit.ts           # checkIpLimit(), incrementIpCount()
│   ├── r2.ts                    # uploadToR2() — Cloudflare R2 via S3 SDK
│   ├── fitEngine.ts             # getFitRecommendation(), getFitScore()
│   ├── crypto.ts                # hashApiKey() — SHA-256 for key storage
│   ├── supabase.ts              # Supabase client factory (anon + service-role)
│   ├── rateLimit.ts             # Generic rate limiter (per-key monthly limit)
│   ├── providers/               # AI provider adapters (Phase 9)
│   │   ├── tnb.ts               # The New Black AI adapter
│   │   ├── seedream.ts          # BytePlus Seedream adapter
│   │   └── registry.ts          # Provider registry + fallback chain
│   ├── cache.ts                 # Redis + in-memory LRU cache (Phase 12)
│   ├── retry.ts                 # Exponential backoff with jitter (Phase 11)
│   ├── ssrfGuard.ts             # SSRF protection — blocks private IP ranges (Phase 1)
│   ├── logger.ts                # Structured logger (Phase 3/7)
│   │                            #   JSON output, request-id correlation
│   ├── measurementUtils.ts      # Body measurement parsing + unit conversion
│   └── __tests__/               # Vitest unit tests for lib modules
│       ├── fitEngine.test.ts
│       ├── crypto.test.ts
│       └── ...
├── store/                       # Zustand global state
│   ├── useStore.ts              # AppState store definition + actions
│   ├── selectors.ts             # Typed selector hooks (Phase 19)
│   │                            #   useUserImage(), useTryOnResult(), etc.
│   └── index.ts                 # Barrel export
├── types/                       # TypeScript type definitions
│   ├── index.ts                 # Domain types: TryOnResult, MarketplaceContext,
│   │                            #   FitRecommendation, UserMeasurements, ...
│   └── database.ts              # Supabase-generated Database<T> types
└── workers/                     # BullMQ job workers (Phase 10)
    └── aiWorker.ts              # Video try-on job processor
```

---

## Data Flow

### Primary Try-On Request (Image)

```
User action (click "Try On" in Studio)
  → useTryOn hook → api.tryOn() (apiClient.ts)
  → fetch POST /api/tryon (Next.js Route Handler)
  → middleware.ts (x-vexa-key validation + usage log)
  → ipRateLimit.checkIpLimit() → ip_usage_limits (Supabase)
  → authenticateRequest() (marketplace key | Supabase Bearer | guest)
  → resolveToPublicUrl() → uploads blob/base64 to R2
  → callTNB() with tail hedging (two parallel requests, 3s offset)
    → TNBProvider.call() via provider registry
  → persistResultImage() → R2 primary, Supabase Storage fallback
  → upsert tryon_results (Supabase)
  → incrementIpCount()
  → return { resultUrl, fitLabel, recommendedSize, fitScore, generationsRemaining }
  → useStore.setTryOnResult(result)  ← Zustand state update
  → React re-render via selector subscription (selectors.ts)
  → TryOnResult component displays result image
```

### Avatar Generation Flow

```
User action (complete onboarding step 5)
  → useApiCall hook → POST /api/avatar/generate
  → Supabase Bearer JWT validated
  → IDOR check: userId in token must match request body
  → If AVATAR_SERVICE_URL set:
      → fetch {AVATAR_SERVICE_URL}/generate-avatar
        (INTERNAL_SERVICE_TOKEN bearer header)
      → Python FastAPI returns { avatar_url, status: 'ready' }
  → Else: return placeholder /models/avatar.glb
  → UPDATE users.avatar_url in Supabase
  → Return { avatarUrl, status: 'ready' }
  → useStore.setCurrentUser({ ...user, avatarUrl })
  → AvatarViewer mounts with useProgressiveGlb() hook:
      → Load low-poly placeholder GLB immediately
      → Fetch full-resolution GLB in background
      → Swap geometry when loaded (no flash)
```

### AI Design Generation Flow

```
User action (submit design prompt in Studio)
  → api.studioDesign() (apiClient.ts)
  → POST /api/studio/design
  → ipRateLimit.checkIpLimit('design', 3 per 24h)
  → OpenAI GPT-4o-mini: enrich prompt with fashion context
  → Seedream (BytePlus Ark) image generation (primary)
    → on failure: DALL-E 3 via openai SDK (fallback)
  → persistResultImage() → R2 → design_history (Supabase)
  → Return { designImageUrl, prompt }
  → useStore.setDesignResult(result)
```

### B2B Embed Widget Flow

```
Marketplace page loads iframe:
  <iframe src="https://vexatryon.in/embed?productId=X&productImageUrl=Y&marketplaceKey=Z">

  → /embed page.tsx renders in iframe
  → GET /api/keys/validate?key=Z  →  validates SHA-256 hash against api_keys table
  → If valid: render try-on UI inside iframe
  → User uploads photo
  → POST /api/tryon with x-vexa-key: Z header
  → Bypasses IP rate limit (authenticated marketplace client)
  → Returns try-on result inside iframe
```

---

## State Management

| Scope | Technology | Location | Contents |
|---|---|---|---|
| Global client state | Zustand | `src/store/useStore.ts` | userImage, currentUser, tryOnResult, selectedOutfit, favorites, loading flags |
| Typed selectors | Zustand hooks | `src/store/selectors.ts` | `useUserImage()`, `useTryOnResult()`, `useCurrentUser()`, `useFavorites()` |
| Server state | Supabase Postgres | Hosted | users, tryon_results, api_keys, usage_logs, ip_usage_limits, design_history, size_charts |
| Auth state | Supabase Auth | `src/lib/supabase.ts` | JWT session, user object |
| Cache | Redis + LRU | `src/lib/cache.ts` | Generation results (24h TTL), upload URLs, provider response dedup |
| Local / ephemeral | React `useState` | Per-component | Form inputs, wizard step progress, UI toggle states, modal open/close |

---

## Authentication Paths

Two independent authentication mechanisms co-exist:

```
Request arrives at /api/*
         │
         ▼
┌─────────────────────────────────────┐
│ middleware.ts                        │
│ Does x-vexa-key header exist?        │
│    YES → validate SHA-256 hash       │
│          log to usage_logs           │
│          attach MarketplaceContext   │
│    NO  → pass through                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Route handler (requireApiKey or      │
│ authenticateRequest)                 │
│                                      │
│ Mode 1: MarketplaceContext present   │
│   → B2B client authenticated         │
│   → IP rate limit bypassed           │
│                                      │
│ Mode 2: Authorization: Bearer <JWT>  │
│   → Supabase JWT verified            │
│   → End-user flow                    │
│                                      │
│ Mode 3: No auth                      │
│   → Guest / demo mode                │
│   → IP rate limited (2 tryons/24h)   │
└─────────────────────────────────────┘
```

---

## Layer Dependency Rules

```
Presentation (pages, components)
    ↓ imports from
Hooks (useApiCall, useTryOn, useUser, useDeviceCapability)
    ↓ imports from
Store (Zustand) and Lib (apiClient, utilities)
    ↓ imports from (server-side only)
External (Supabase, R2, TNB AI, Python service)
```

**No circular imports.** `lib/` is never imported by `store/`. `hooks/` never imports from `app/api/`. API routes never import from `components/` or `store/`.

---

## Key Design Patterns

### BFF (Backend-for-Frontend)

All AI provider calls, database writes, and secret-bearing operations happen in
`src/app/api/` route handlers. The browser never holds API keys or makes direct
calls to TNB, OpenAI, or Supabase with the service-role key.

### Tail Hedging on Critical AI Path

`/api/tryon` sends two parallel requests to TNB with a 3-second stagger. The first
valid result wins; the slower request is aborted. This reduces p99 latency by ~20%
without increasing cost (only one result is used).

### Storage Dual-Write

`persistResultImage()` tries Cloudflare R2 first, then Supabase Storage, then
returns the original URL if both fail. This means the try-on result is always
returned to the user — never blocked by a storage outage.

### Provider Registry (Phase 9)

`src/lib/providers/registry.ts` maps provider names to adapter classes implementing
a common `call(prompt, params)` interface. New AI providers can be added without
modifying route handlers. Fallback chains are configured declaratively.

### Feature Barrels (Phase 15)

`src/features/*/index.ts` barrel files re-export types, hooks, and components for
each domain. Pages and external consumers import from `@/features/tryon` rather than
navigating deep import paths. This decouples the directory structure from the API
surface.

### Progressive GLB Loading (Phase 17)

`useProgressiveGlb` loads a small placeholder mesh immediately (< 50 KB) while
the full-resolution GLB downloads in the background. The swap is seamless — the
Three.js geometry is replaced without unmounting the Canvas.

---

## Architectural Constraints

- **No secret exposure**: API route handlers create fresh Supabase service-role clients per request. The module-level client in `supabase.ts` uses the anon key only.
- **SSRF protection**: `ssrfGuard.ts` blocks requests to RFC-1918 IP ranges from `resolveToPublicUrl()` and the image proxy.
- **Internal service token**: Python backend accepts only `Bearer INTERNAL_SERVICE_TOKEN` — never exposed to browser clients.
- **No Redux / Context API for global state**: Zustand is the only global state manager. React Context is used only for narrow provider trees (e.g., theme).
- **No circular imports**: Enforced by layer dependency rule above; violations are ESLint errors.

---

*Architecture map generated for VEXA v2.0 — Phase 20 documentation.*
