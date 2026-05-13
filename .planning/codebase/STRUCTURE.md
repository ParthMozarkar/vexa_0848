# Codebase Structure

**Analysis Date:** 2026-05-13

## Directory Layout

```
vexa_0848/                          # Monorepo root
├── backend/                        # Python FastAPI avatar service
│   ├── main.py                     # FastAPI app entry point
│   ├── pipeline/                   # ML processing modules
│   │   ├── body_generator.py       # SMPL-X mesh generation
│   │   ├── face_texture.py         # Face region extraction
│   │   ├── archetype_selector.py   # Body archetype selection
│   │   ├── r2_uploader.py          # Cloudflare R2 upload (boto3)
│   │   └── video_processor.py      # Video frame processing
│   └── tests/                      # Backend tests
├── frontend/                       # Next.js 14+ App Router application
│   ├── src/
│   │   ├── app/                    # Next.js App Router root
│   │   │   ├── layout.tsx          # Root layout (fonts, analytics)
│   │   │   ├── page.tsx            # Landing page (/)
│   │   │   ├── globals.css         # Global Tailwind + CSS vars
│   │   │   ├── components/         # Page-scoped landing sections
│   │   │   │   ├── HeroSection.tsx
│   │   │   │   ├── DemoSection.tsx
│   │   │   │   ├── FeaturesSection.tsx
│   │   │   │   └── ...
│   │   │   ├── api/                # All Next.js Route Handlers
│   │   │   │   ├── tryon/
│   │   │   │   │   ├── route.ts            # POST /api/tryon (main)
│   │   │   │   │   ├── [productId]/        # POST /api/tryon/:productId
│   │   │   │   │   ├── batch/              # POST /api/tryon/batch
│   │   │   │   │   └── video/              # POST /api/tryon/video
│   │   │   │   │       └── status/         # GET /api/tryon/video/status
│   │   │   │   ├── avatar/
│   │   │   │   │   ├── generate/           # POST /api/avatar/generate
│   │   │   │   │   └── [userId]/           # GET /api/avatar/:userId
│   │   │   │   ├── studio/
│   │   │   │   │   ├── design/             # POST /api/studio/design
│   │   │   │   │   ├── model-gen/          # POST /api/studio/model-gen
│   │   │   │   │   ├── trends/             # GET /api/studio/trends
│   │   │   │   │   └── video-gen/          # POST /api/studio/video-gen
│   │   │   │   ├── keys/
│   │   │   │   │   ├── generate/           # POST /api/keys/generate
│   │   │   │   │   ├── list/               # GET /api/keys/list
│   │   │   │   │   ├── revoke/             # POST /api/keys/revoke
│   │   │   │   │   └── validate/           # GET /api/keys/validate
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login/              # POST /api/auth/login
│   │   │   │   │   └── signup/             # POST /api/auth/signup
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── stats/              # GET /api/dashboard/stats
│   │   │   │   │   └── analytics/          # GET /api/dashboard/analytics
│   │   │   │   ├── proxy/                  # GET /api/proxy?url= (CORS image proxy)
│   │   │   │   ├── upload/                 # POST /api/upload
│   │   │   │   ├── size/                   # GET /api/size
│   │   │   │   ├── clothing/               # POST /api/clothing
│   │   │   │   │   └── status/[taskId]/    # GET /api/clothing/status/:taskId
│   │   │   │   ├── bookings/               # POST /api/bookings
│   │   │   │   ├── ar/session/             # POST /api/ar/session
│   │   │   │   ├── user/delete/            # DELETE /api/user/delete
│   │   │   │   ├── webhook/avatar-ready/   # POST /api/webhook/avatar-ready
│   │   │   │   └── health/                 # GET /api/health
│   │   │   ├── studio/                     # /studio page (primary try-on UI)
│   │   │   ├── onboarding/                 # /onboarding wizard
│   │   │   ├── dashboard/                  # /dashboard (admin/B2B)
│   │   │   ├── embed/                      # /embed (iframe widget)
│   │   │   ├── products/                   # /products and /products/[id]
│   │   │   ├── auth/signup/                # /auth/signup
│   │   │   ├── ar/[productId]/             # /ar/:productId
│   │   │   ├── 3d/                         # /3d viewer
│   │   │   ├── video-tryon/                # /video-tryon
│   │   │   ├── virtual-try-on/             # redirects to /studio
│   │   │   ├── design/                     # /design studio tab
│   │   │   ├── favorites/                  # /favorites
│   │   │   ├── integration/                # /integration docs page
│   │   │   ├── pricing/                    # /pricing
│   │   │   ├── blog/[slug]/                # /blog/:slug
│   │   │   ├── admin/                      # /admin
│   │   │   └── privacy/                    # /privacy
│   │   ├── components/                     # Shared reusable components
│   │   │   ├── Header.tsx                  # Site-wide nav header
│   │   │   ├── Footer.tsx                  # Site-wide footer
│   │   │   ├── GlobalLayout.tsx            # Layout shell (wraps all pages)
│   │   │   ├── Navbar.tsx                  # Alternative nav bar
│   │   │   ├── ProductCard.tsx             # Product listing card
│   │   │   ├── VideoTryOn.tsx              # Video try-on component
│   │   │   ├── BookingFormSection.tsx      # Demo booking form
│   │   │   ├── ARTryOn.tsx                 # AR overlay component
│   │   │   ├── AvatarCarousel.tsx          # Archetype carousel
│   │   │   ├── CalendarPicker.tsx          # Calendar UI
│   │   │   ├── Testimonials.tsx            # Testimonials section
│   │   │   ├── FAQ.tsx                     # FAQ accordion
│   │   │   ├── AvatarViewer/               # 3D GLB viewer (Three.js / R3F)
│   │   │   ├── FaceCapture/                # Webcam face photo capture
│   │   │   ├── MeasurementForm/            # Body measurements input form
│   │   │   ├── TryOnOverlay/               # Try-on result overlay
│   │   │   ├── studio/                     # Studio-specific components
│   │   │   │   ├── ImageUploadBox.tsx      # Drag-and-drop image upload
│   │   │   │   ├── ModelGenerator.tsx      # AI model generation UI
│   │   │   │   └── SizeCompass.tsx         # Fit recommendation display
│   │   │   └── ui/                         # Generic design system primitives
│   │   │       ├── card.tsx
│   │   │       ├── AppImage.tsx
│   │   │       ├── AppLogo.tsx
│   │   │       ├── AppIcon.tsx
│   │   │       ├── ComingSoonOverlay.tsx
│   │   │       ├── gooey-text-morphing.tsx
│   │   │       ├── interactive-3d-robot.tsx
│   │   │       └── ripple-grid.tsx
│   │   ├── hooks/                          # React custom hooks
│   │   │   ├── useUser.ts                  # Supabase auth session + user row
│   │   │   ├── useTryOn.ts                 # Try-on state machine hook
│   │   │   └── useClothingGlb.ts           # Clothing GLB signed URL loader
│   │   ├── lib/                            # Server-side utility functions
│   │   │   ├── supabase.ts                 # Anon Supabase client (client-safe)
│   │   │   ├── apiKeyMiddleware.ts         # x-vexa-key validation helpers
│   │   │   ├── ipRateLimit.ts              # Per-IP generation rate limiter
│   │   │   ├── rateLimit.ts                # Generic rate limit utilities
│   │   │   ├── r2.ts                       # Cloudflare R2 upload (aws-sdk v3)
│   │   │   ├── fitEngine.ts                # Fit label + score from measurements
│   │   │   ├── crypto.ts                   # SHA-256 API key hasher
│   │   │   ├── clothingCategory.ts         # Category → TNB endpoint mapping
│   │   │   ├── measurementUtils.ts         # Unit conversion, validation
│   │   │   ├── morphEngine.ts              # Avatar blend weight calculation
│   │   │   ├── admin.ts                    # Admin action audit logger
│   │   │   ├── utils.ts                    # General helpers (cn, etc.)
│   │   │   └── __tests__/                  # Unit tests for lib modules
│   │   ├── middleware/                     # Client-side guards
│   │   │   └── onboardingGuard.tsx         # Redirects unauthenticated / no-avatar users
│   │   ├── store/
│   │   │   └── useStore.ts                 # Single Zustand store (AppState)
│   │   ├── types/
│   │   │   ├── index.ts                    # All domain types (Outfit, TryOnResult, etc.)
│   │   │   └── database.ts                 # Supabase table row types + Database interface
│   │   ├── data/                           # Static data files
│   │   └── styles/                         # Additional style files
│   ├── middleware.ts                       # Next.js edge middleware (API key gate)
│   ├── public/
│   │   ├── assets/images/                  # Static image assets
│   │   └── models/
│   │       └── avatar.glb                  # Placeholder avatar model
│   ├── supabase/                           # Supabase project config / migrations
│   ├── types/                              # Root-level TS type stubs
│   └── next.config.js / tsconfig.json     # Framework config
├── docs/                                   # Project documentation
├── .planning/codebase/                     # GSD codebase map documents
├── vercel.json                             # Vercel deployment config
├── package.json                            # Root scripts (concurrently start)
└── start_all.ps1                           # Windows dev startup script
```

## Directory Purposes

**`backend/`:**
- Purpose: Standalone Python FastAPI microservice for avatar generation
- Contains: FastAPI app, Pydantic models, SMPL-X pipeline, R2 uploader
- Key files: `backend/main.py`, `backend/pipeline/body_generator.py`, `backend/pipeline/r2_uploader.py`

**`frontend/src/app/api/`:**
- Purpose: All server-side API logic using Next.js Route Handlers
- Contains: One `route.ts` per endpoint, each defining exported HTTP method handlers
- Key files: `frontend/src/app/api/tryon/route.ts`, `frontend/src/app/api/avatar/generate/route.ts`, `frontend/src/app/api/studio/design/route.ts`

**`frontend/src/components/`:**
- Purpose: Shared React components used across multiple pages
- Contains: Complex feature components (AvatarViewer, FaceCapture, BookingFormSection), layout components (Header, Footer, GlobalLayout), design system primitives in `ui/`
- Key files: `frontend/src/components/Header.tsx`, `frontend/src/components/studio/ImageUploadBox.tsx`

**`frontend/src/app/components/`:**
- Purpose: Page-scoped components used only by `app/page.tsx` (landing page)
- Contains: HeroSection, DemoSection, FeaturesSection, BenefitsSection, TestimonialsSection, CTASection
- Note: These are NOT shared — they live co-located with their only consumer

**`frontend/src/lib/`:**
- Purpose: Server-side utility functions (never imported client-side except `supabase.ts`)
- Contains: Auth helpers, storage clients, business logic utilities
- Key files: `frontend/src/lib/apiKeyMiddleware.ts`, `frontend/src/lib/ipRateLimit.ts`, `frontend/src/lib/r2.ts`

**`frontend/src/hooks/`:**
- Purpose: React custom hooks encapsulating client-side async logic
- Contains: Auth state (`useUser`), try-on state machine (`useTryOn`), asset loading (`useClothingGlb`)

**`frontend/src/store/`:**
- Purpose: Client-side global state
- Contains: Single Zustand store with all app-level state

**`frontend/src/types/`:**
- Purpose: TypeScript type definitions — both domain types and database schema types
- Contains: `index.ts` (domain), `database.ts` (Supabase `Database` generic)

## Key File Locations

**Entry Points:**
- `frontend/src/app/layout.tsx`: Root Next.js layout — fonts, metadata, analytics wrapper
- `frontend/middleware.ts`: Request gate for all `/api/*` routes
- `backend/main.py`: Python service entry point (FastAPI app object)

**Configuration:**
- `vercel.json`: Deployment target — `buildCommand: cd frontend && npm install && npm run build`
- `frontend/next.config.js`: Next.js framework config (image domains, etc.)
- `frontend/tsconfig.json`: TypeScript config with `@/` path alias → `./src/`

**Core Business Logic:**
- `frontend/src/app/api/tryon/route.ts`: Try-on orchestration, TNB hedging, persistence
- `frontend/src/lib/apiKeyMiddleware.ts`: B2B auth — `validateApiKey()`, `withApiKey()`, `requireApiKey()`
- `frontend/src/lib/ipRateLimit.ts`: Guest rate limiting — `checkIpLimit()`, `incrementIpCount()`
- `frontend/src/lib/r2.ts`: Storage abstraction — `uploadToR2()` with graceful no-op fallback
- `frontend/src/lib/fitEngine.ts`: Fit recommendation — `getFitRecommendation()`, `getFitScore()`

**Types:**
- `frontend/src/types/index.ts`: All domain interfaces (`TryOnResult`, `Outfit`, `MarketplaceContext`, `AvatarRecord`, etc.)
- `frontend/src/types/database.ts`: Supabase row types and `Database` interface for typed client

**State:**
- `frontend/src/store/useStore.ts`: Zustand `AppState` — single store for all client state

**Testing:**
- `frontend/src/lib/__tests__/`: Unit tests for lib utilities
- `backend/tests/`: Python backend tests

## Naming Conventions

**Files:**
- React components: PascalCase (e.g., `BookingFormSection.tsx`, `ImageUploadBox.tsx`)
- Route handlers: always `route.ts` (Next.js convention)
- Hooks: camelCase prefixed with `use` (e.g., `useUser.ts`, `useTryOn.ts`)
- Lib utilities: camelCase (e.g., `apiKeyMiddleware.ts`, `ipRateLimit.ts`)
- Type files: camelCase (e.g., `database.ts`, `index.ts`)
- Python modules: snake_case (e.g., `body_generator.py`, `r2_uploader.py`)

**Directories:**
- API routes: match URL path segment, lowercase with hyphens (e.g., `model-gen/`, `video-gen/`)
- Feature component groups: PascalCase directories with `index.tsx` (e.g., `AvatarViewer/`, `FaceCapture/`)
- Design system primitives: lowercase (e.g., `ui/`)

## Where to Add New Code

**New API endpoint (e.g., `POST /api/recommendations`):**
- Create: `frontend/src/app/api/recommendations/route.ts`
- Export named function `POST(req: NextRequest): Promise<NextResponse>`
- Use `getServiceSupabase()` pattern for DB access
- Add IP rate limit check for guest-facing endpoints using `checkIpLimit()` from `frontend/src/lib/ipRateLimit.ts`
- Add `x-vexa-key` bypass for marketplace clients using `validateApiKey()` from `frontend/src/lib/apiKeyMiddleware.ts`

**New shared component:**
- Implementation: `frontend/src/components/ComponentName.tsx` (or `ComponentName/index.tsx` if multi-file)
- If studio-specific: `frontend/src/components/studio/ComponentName.tsx`
- If design system primitive: `frontend/src/components/ui/component-name.tsx`

**New page:**
- Location: `frontend/src/app/page-name/page.tsx`
- Add `"use client"` directive if using React state/effects
- Use `useUser()` hook for auth state; access global state via `useStore()`

**New lib utility (server-side only):**
- Location: `frontend/src/lib/utility-name.ts`
- Never import browser APIs; this code runs in Node.js route handlers

**New domain type:**
- Add to `frontend/src/types/index.ts`
- If it maps to a Supabase table row, also add to `frontend/src/types/database.ts` and the `Database.public.Tables` map

**New Python pipeline module:**
- Location: `backend/pipeline/module_name.py`
- Import lazily inside the route handler (see `generate_avatar_full` pattern in `backend/main.py`) to avoid breaking stub path on servers without heavy deps
- Add tests to `backend/tests/`

**New Zustand state slice:**
- Add fields and setters to the `AppState` interface in `frontend/src/store/useStore.ts`
- Follow existing pattern: `field: Type | null` + `setField: (val: Type | null) => void`

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD codebase map documents consumed by planning and execution commands
- Generated: Yes (by `/gsd-map-codebase`)
- Committed: Yes

**`frontend/.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No

**`frontend/node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

**`backend/__pycache__/`:**
- Purpose: Python bytecode cache
- Generated: Yes
- Committed: No

**`frontend/public/models/`:**
- Purpose: Static 3D model assets served at `/models/*`
- Key file: `avatar.glb` — placeholder avatar returned when Python service is unavailable
- Generated: No
- Committed: Yes

**`frontend/supabase/`:**
- Purpose: Supabase CLI project config and local dev / migration files
- Generated: Partially (`.temp/` is generated)
- Committed: Config yes, `.temp/` no

---

*Structure analysis: 2026-05-13*
