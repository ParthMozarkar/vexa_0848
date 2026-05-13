<!-- GSD:project-start source:PROJECT.md -->
## Project

**VEXA — Production Security Hardening**

VEXA is an AI-powered virtual try-on and avatar platform built on Next.js 15 (frontend + API routes) and a Python FastAPI backend. It serves B2B marketplace clients via an API key system and end-users via a web app. This project hardness the existing codebase for production: eliminating SSRF, auth bypasses, key leakage, insecure uploads, and missing infrastructure (Docker, CI/CD, observability).

**Core Value:** Zero-regression security hardening — every critical vulnerability closed without breaking the working try-on, avatar, upload, and marketplace flows.

### Constraints

- **Compatibility**: Must not break /api/tryon, /api/upload, /api/avatar/generate, /api/proxy image flows
- **No secrets in code**: All credentials via environment variables only
- **No auto-deploy**: CI/CD pipelines verify only — no production push automation
- **Python service**: Must remain compatible with Next.js proxy calls using INTERNAL_SERVICE_TOKEN Bearer auth
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.x - Frontend (Next.js app, API routes, all `frontend/src/`)
- Python 3.x - Backend avatar/video pipeline (`backend/`)
- JavaScript - Config files (`next.config.mjs`, `eslint.config.mjs`, `postcss.config.mjs`)
- SQL - Supabase schema migrations (`frontend/supabase/*.sql`)
## Runtime
- Node.js 20.x (frontend) - inferred from `@types/node: ^20` in `frontend/package.json`
- Python 3.x (backend) - inferred from FastAPI + pytorch stack in `backend/requirements.txt`
- npm (frontend) - Lockfile: `frontend/package-lock.json` present
- pip / uv (backend) - uv 0.11.7 listed in `backend/requirements.txt`; no lockfile detected
## Frameworks
- Next.js 15.1.11 - Full-stack React framework, App Router, all frontend routing and API routes (`frontend/src/app/`)
- React 19.0.3 - UI component rendering (`frontend/src/`)
- FastAPI 0.129.0 - Python REST API for avatar + video pipeline (`backend/main.py`)
- Vitest - Frontend unit tests; config at `frontend/vitest.config.ts`; test files in `frontend/src/lib/__tests__/`
- TypeScript 5.x compiler (`tsc --noEmit` via `type-check` script)
- ESLint 9.x + TypeScript ESLint plugin - Linting (`frontend/eslint.config.mjs`)
- Prettier 3.5.3 - Code formatting (`frontend/package.json` format script)
- PostCSS 8.4.8 + Autoprefixer 10.4.2 - CSS processing (`frontend/postcss.config.js`)
- Tailwind CSS 3.4.6 - Utility-first CSS (`frontend/tailwind.config.js`)
- Uvicorn 0.41.0 - ASGI server for Python backend (`backend/start.sh`)
## Key Dependencies
- `@supabase/supabase-js ^2.101.1` - Database client, auth, storage (`frontend/src/lib/supabase.ts`)
- `@aws-sdk/client-s3 ^3.1028.0` - Cloudflare R2 uploads via S3-compatible API (`frontend/src/lib/r2.ts`)
- `openai ^6.37.0` - GPT-4o-mini prompt engineering + DALL-E 3 image generation (`frontend/src/app/api/studio/design/route.ts`, `frontend/src/app/api/studio/trends/route.ts`)
- `next 15.1.11` - Framework core
- `framer-motion ^12.38.0` - Animations throughout UI
- `recharts ^2.15.2` - Dashboard analytics charts (`frontend/src/app/dashboard/`)
- `googleapis ^144.0.0` - Google Calendar API for bookings (`frontend/src/app/api/bookings/route.ts`)
- `resend ^4.1.2` - Transactional email (`frontend/src/app/api/bookings/route.ts`)
- `fastapi 0.129.0` - API server (`backend/main.py`)
- `torch 2.11.0` - Deep learning for SMPL-X avatar pipeline
- `smplx 0.1.28` - 3D human body parametric model for avatar generation (`backend/pipeline/body_generator.py`)
- `mediapipe` - Face landmark detection for face texture extraction (`backend/pipeline/face_texture.py`)
- `trimesh 4.11.5` - 3D mesh handling and GLB export (`backend/main.py`)
- `boto3 1.42.87` - Cloudflare R2 upload from Python backend (`backend/pipeline/r2_uploader.py`)
- `pipecat-ai 0.0.103` - AI voice/conversation pipeline (listed in requirements, future use)
- `deepgram-sdk 2.12.0` - Speech-to-text (listed in requirements, future use)
- `groq 1.0.0` - LLM inference (listed in requirements, future use)
- `twilio 9.10.2` - Communications (listed in requirements, future use)
- `sarvamai 0.1.25` - Sarvam AI SDK (listed in requirements, future use)
- `@react-three/fiber ^9.5.0` + `@react-three/drei ^10.7.7` - 3D avatar viewer (`frontend/src/components/AvatarViewer/`)
- `@splinetool/react-spline ^4.1.0` - 3D hero/marketing scenes (`frontend/src/app/`)
- `three ^0.183.2` - WebGL/3D rendering engine
- `@react-three/xr ^6.6.29` - WebXR / AR support (`frontend/src/app/ar/`)
- `@tavily/core ^0.7.3` - Web search API (listed, not yet actively used in API routes)
- `@vercel/analytics ^2.0.1` - Web analytics (`frontend/src/app/layout.tsx`)
- `@next/third-parties ^16.2.4` - Google Analytics integration (`frontend/src/app/layout.tsx`)
## Configuration
- Frontend: `.env.local` file (not committed); example at `frontend/.env.local.example`
- Backend: `.env` file (not committed); example at `backend/.env.example`
- Key frontend vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `TNB_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MESHY_API_KEY`, `BLACKBOX_API_KEY`, `ANAKIN_API_KEY`, `BYTEDANCE_API_KEY` / `SEEDREAM_API_KEY`, `RESEND_API_KEY`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `VEXA_ADMIN_KEY`, `PYTHON_SERVICE_URL`, `AVATAR_SERVICE_URL`
- Key backend vars: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `INTERNAL_SERVICE_TOKEN`, `NEXT_PUBLIC_APP_URL`, `SMPLX_MODEL_PATH`
- Next.js config: `frontend/next.config.mjs` (bundle optimization, image caching, AVIF/WebP formats)
- TypeScript config: `frontend/tsconfig.json` (strict mode, `@/*` path alias → `src/*`)
- Tailwind config: `frontend/tailwind.config.js`
- Netlify plugin: `@netlify/plugin-nextjs ^5.11.1` (configured as devDep)
- Vercel config: `frontend/vercel.json` (function maxDuration overrides for tryon + clothing routes)
## Platform Requirements
- Node.js 20+
- Python 3.10+ (for backend; smplx, mediapipe, torch requirements)
- CUDA-capable GPU recommended for `generate-avatar-full` SMPL-X pipeline
- Dev server runs on port 4028 (`next dev -p 4028`)
- Backend FastAPI runs on port 8000 (`AVATAR_SERVICE_URL=http://127.0.0.1:8000`)
- Dual deployment: Next.js frontend on Vercel (primary, `vercel.json` present) or Netlify (`@netlify/plugin-nextjs`)
- Python backend deployable separately (Uvicorn ASGI server)
- Cloudflare R2 for asset storage (bucket: `vexa-assets`)
- Supabase hosted (Postgres + Auth + Storage)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase `.tsx` — `ProductCard.tsx`, `AvatarViewer`, `TryOnOverlay`
- Lib/utility modules: camelCase `.ts` — `fitEngine.ts`, `morphEngine.ts`, `measurementUtils.ts`, `ipRateLimit.ts`
- API route handlers: always named `route.ts`, nested in directories matching the URL path — `src/app/api/tryon/route.ts`, `src/app/api/keys/generate/route.ts`
- Type definition files: `index.ts` for domain types, `database.ts` for DB-generated types — `src/types/index.ts`, `src/types/database.ts`
- camelCase for all exported functions — `getFitRecommendation`, `computeMorphBlend`, `hashApiKey`, `checkIpLimit`
- Higher-order wrapper functions prefixed with `with` — `withApiKey` in `src/lib/apiKeyMiddleware.ts`
- Guard/check functions prefixed with `require` or `check` — `requireApiKey`, `checkIpLimit`, `checkRateLimit`
- Private/internal helpers (not exported) use camelCase — `getServiceSupabase`, `parseTNBResponse`, `runRequest`
- camelCase throughout — `rawKey`, `hashedKey`, `marketplaceCtx`, `clientIp`
- SCREAMING_SNAKE_CASE for module-level constants — `VEXA_KEY_HEADER`, `MARKETPLACE_CTX_HEADER`, `MAX_TRYON_PER_24H`, `CM_PER_INCH`, `FETCH_TIMEOUT_MS`
- PascalCase for interfaces and type aliases — `MarketplaceContext`, `FitRecommendation`, `MorphBlend`, `RateLimitResult`
- Props interfaces named `[ComponentName]Props` — `ProductCardProps`
- Body/request shape interfaces defined locally in route files — `LoginBody`, `DesignRequest`, `VideoJobInsertRow`
- Database row types named `[Entity]Row` — `ApiKeyRow`, `UserRow`, `SizeChartRow`
- Use `type` imports when importing only types: `import type { MarketplaceContext } from '@/types'`
## Code Style
- Semicolons: required
- Quotes: single (`'`) for all strings
- Indent: 2 spaces
- Print width: 100 characters
- Trailing commas: `es5` (objects, arrays, function params where valid)
- Bracket same line: false (JSX closing `>` on its own line)
- Line endings: auto
- Extends: `next/core-web-vitals`, `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `plugin:prettier/recommended`
- Parser: `@typescript-eslint/parser`
- `@typescript-eslint/no-unused-vars`: warn — prefix with `_` to suppress (`_unused`, `_err`)
- `@typescript-eslint/no-explicit-any`: warn — avoid `any`; use typed casts or `unknown` where possible
- `no-console`: warn — only `console.warn`, `console.error`, `console.info` are allowed; `console.log` is a lint violation (though some violations exist in `src/app/api/tryon/route.ts` and `src/app/api/studio/design/route.ts`)
## Import Organization
- `@/` resolves to `frontend/src/` — configured in `frontend/vitest.config.ts` and `tsconfig.json`
- All internal imports must use `@/` — never use relative paths like `../../lib/`
## Error Handling
- Wrap entire handler body in `try/catch (err: unknown)` — cast with `err instanceof Error ? err.message : String(err)`
- Return `NextResponse.json({ error: message }, { status: N })` for all error responses
- HTTP status codes used consistently:
- Non-fatal failures (DB persistence, R2 upload fallback) are caught locally, logged with `console.warn`, and allow the request to continue rather than failing
- Pure functions that cannot meaningfully continue throw `Error` with descriptive messages — `l2SquaredDistance` throws on length mismatch, `morphEngine.ts`
- Functions with nullable outcomes return `null` rather than throwing — `validateApiKey` returns `null` on auth failure
- Discriminated union return pattern used for inline auth checks: `{ ctx, error: null } | { ctx: null, error: NextResponse }` — see `requireApiKey` in `src/lib/apiKeyMiddleware.ts`
- Catch-all `try/catch` silently returns the original value on external fetch failure — `resolveToPublicUrl`, `persistResultImage` in `src/app/api/tryon/route.ts`
- DB errors on non-critical paths are always non-fatal with `console.warn`
- Always use type guards before accessing unknown-typed values: `isLoginBody` function in `src/app/api/auth/login/route.ts`
- Cast via `e instanceof Error ? e.message : String(e)` — never assume error type
## Logging
## Comments
## Function Design
- Always explicitly type async functions returning `NextResponse` — `async function POST(req: NextRequest): Promise<NextResponse>`
- Return `null` for "not found" / unauthorized outcomes in lib functions
- Avoid returning `undefined` — use `null` as the explicit empty signal
## Module Design
- Named exports only in lib modules — no default exports
- API route handlers use named HTTP verb exports (`export async function POST`, `export async function GET`) per Next.js App Router convention
- React components use default exports — `export default function ProductCard`
- `src/types/index.ts` acts as the barrel for all shared domain types
- `src/lib/` modules are NOT barrel-exported — import each module directly: `import { hashApiKey } from '@/lib/crypto'`
## Security Conventions (from `src/lib/apiKeyMiddleware.ts`)
- Raw API keys are never stored in the DB — only SHA-256 hashes via `hashApiKey` in `src/lib/crypto.ts`
- Raw keys are never logged — enforced by code comment
- Dev bypass keys come from environment variables only (`DEV_API_KEY`, `INTERNAL_ONBOARDING_KEY`) — never hardcoded
- Measurement data is PII — no `console.log` of measurement values (stated in `src/lib/measurementUtils.ts` header comment)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- Next.js API routes act as the sole BFF — browsers never call the Python service directly
- Two auth paths: B2B marketplace clients send `x-vexa-key`; end users send Supabase Bearer tokens
- Demo/guest mode always available: no key required for unauthenticated requests (IP rate-limited)
- Tail hedging on critical AI path: two parallel TNB requests after a 3s offset; first valid result wins
- Storage dual-write: Cloudflare R2 is primary, Supabase Storage is fallback (transparent to callers)
## Layers
- Purpose: React pages and reusable UI components
- Location: `frontend/src/app/` (pages), `frontend/src/components/` (shared), `frontend/src/app/components/` (page-scoped landing sections)
- Contains: Server components, client components (`"use client"`), layout wrappers
- Depends on: Store, hooks, lib utilities
- Used by: End users and marketplace embed iframes
- Purpose: All server-side logic, auth enforcement, AI orchestration, persistence
- Location: `frontend/src/app/api/`
- Contains: Next.js Route Handlers (one `route.ts` per endpoint folder)
- Depends on: `frontend/src/lib/`, Supabase, TNB AI API, Python service
- Used by: Presentation layer and external B2B clients via `x-vexa-key`
- Purpose: Cross-component reactive state
- Location: `frontend/src/store/useStore.ts`
- Contains: Single Zustand store (`AppState`) — user image, selected outfit, try-on result, auth user, favorites
- Depends on: Type definitions in `frontend/src/types/`
- Used by: All client components that need shared state
- Purpose: Stateless utility functions called by API routes
- Location: `frontend/src/lib/`
- Contains: `apiKeyMiddleware.ts`, `ipRateLimit.ts`, `r2.ts`, `fitEngine.ts`, `crypto.ts`, `supabase.ts`, `rateLimit.ts`
- Depends on: Supabase client, AWS SDK (R2), environment variables
- Used by: API layer only (server-side)
- Purpose: Heavy ML workloads — 3D avatar generation, video frame processing
- Location: `backend/`
- Contains: FastAPI app (`main.py`), pipeline modules (`pipeline/`)
- Depends on: smplx, trimesh, torch, mediapipe, boto3
- Used by: Next.js API routes via `AVATAR_SERVICE_URL` env var
## Data Flow
### Primary Try-On Request (Image)
### Avatar Generation Flow
### Full SMPL-X Avatar Pipeline (backend-only, heavy)
### AI Design Generation Flow
### B2B Embed Widget Flow
- Server state: Supabase (single source of truth for users, results, keys, usage)
- Client state: Zustand store (`frontend/src/store/useStore.ts`) — volatile session-scoped state only
- No Redux, no React Context used for global state
## Key Abstractions
- Purpose: Represents an authenticated B2B API client
- Examples: `frontend/src/types/index.ts`, `frontend/src/lib/apiKeyMiddleware.ts`
- Pattern: Returned by `validateApiKey()` when `x-vexa-key` header is valid and SHA-256 hash matches `api_keys` table
- Purpose: Unified shape for all try-on response data
- Examples: `frontend/src/types/index.ts`, `frontend/src/store/useStore.ts`
- Pattern: Contains `resultUrl`, `fitLabel`, `recommendedSize`, `fitScore`, `generationsRemaining`, `status`
- Purpose: Typed Supabase client — eliminates `any` on DB queries
- Examples: `frontend/src/types/database.ts`
- Pattern: `Database` interface with `Tables` map used as generic parameter in `createClient<Database>()`
- Purpose: Reusable try-on orchestration callable from both the main route and sub-routes
- Examples: `frontend/src/app/api/tryon/route.ts`
- Pattern: Exported named function, not just the route handler; allows `[productId]/route.ts` to reuse logic
## Entry Points
- Location: `frontend/src/app/layout.tsx`
- Triggers: Browser page load
- Responsibilities: Fonts, metadata, GlobalLayout wrapper, Vercel Analytics, Google Analytics
- Location: `frontend/middleware.ts`
- Triggers: Every request matching `/api/:path*`
- Responsibilities: `x-vexa-key` validation, call count increment, `usage_logs` insert; passes through unauthenticated requests for demo mode
- Location: `backend/main.py`
- Triggers: `uvicorn backend.main:app` (or `python -m uvicorn ...`)
- Responsibilities: CORS, bearer token auth, avatar and try-on route handlers
- Location: `frontend/src/app/studio/page.tsx`
- Triggers: User navigates to `/studio` (or redirect from `/virtual-try-on`)
- Responsibilities: Upload UI, category selection, multi-garment management, try-on trigger, result display
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
### `any` Type Escape Hatch on Supabase Upsert
### Hardcoded Fit Values Returned Without Calculation
## Error Handling
- API routes wrap all logic in try/catch; return `NextResponse.json({ error: message }, { status: 5xx })`
- AI calls (TNB, Seedream, DALL-E) use nested try/catch with fallback to alternative provider
- Storage writes use try/catch that returns original URL on failure (never throw to caller)
- Python service raises `HTTPException` with structured detail string; unhandled exceptions logged via `logger.exception()`
- `AbortSignal.timeout()` used for all outbound AI/storage fetches — no hanging promises
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
