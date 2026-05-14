
# VEXA Production Security Hardening — Roadmap

**Milestone:** v1.0 Security Hardening
**Mode:** MVP — vertical slices, each phase closes a full attack vector end-to-end
**Granularity:** Standard
**Coverage:** 39/39 requirements mapped

---

## Phases

- [ ] **Phase 1: SSRF Prevention** — Harden /api/proxy and all fetch(url) patterns against server-side request forgery
- [ ] **Phase 2: Internal Service Auth** — Eliminate token bypass in Python backend and demo bypass in key validation
- [ ] **Phase 3: API Key Security** — Move TNB key to header, apply log sanitization, prevent secret leakage
- [ ] **Phase 4: Upload Security** — Magic bytes validation, MIME allowlist, filename sanitization
- [ ] **Phase 5: Deployment Hardening** — Dockerfiles, docker-compose, env templates, startup validation
- [ ] **Phase 6: CI/CD Pipelines** — GitHub Actions workflows for lint, typecheck, test, and build verification
- [ ] **Phase 7: Observability** — Sentry, structured logging, request tracing, AI error logging
- [ ] **Phase 8: Security Documentation** — Audit report, infra architecture, deployment guide, env reference, rollback strategy

---

## Phase Details

### Phase 1: SSRF Prevention
**Goal**: The image proxy and all internal fetch calls cannot be weaponized to reach internal infrastructure or arbitrary external hosts
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: SSRF-01, SSRF-02, SSRF-03, SSRF-04, SSRF-05
**Success Criteria** (what must be TRUE):
  1. A request to /api/proxy with a URL pointing to 169.254.169.254, 127.0.0.1, or any RFC-1918 address receives a 400 response and the fetch is never executed
  2. A request to /api/proxy with an http:// or ftp:// URL is rejected with a 400 before any network call is made
  3. A request to /api/proxy with a hostname not in image-hosts.config.mjs receives a 400
  4. A proxy response larger than 10MB is terminated and returns a 413
  5. All fetch(url) calls in tryon/route.ts validate against the same allowlist before executing
**Plans**: TBD
**UI hint**: no

---

### Phase 2: Internal Service Auth
**Goal**: Every authenticated boundary in the system enforces its check unconditionally — no bypass paths exist in production
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. Starting the Python backend without INTERNAL_SERVICE_TOKEN set (and ENVIRONMENT != development) causes an immediate startup failure with a clear error message before accepting any requests
  2. Calling GET /api/keys/validate with no key returns HTTP 401 — not { valid: true }
  3. Calling GET /api/keys/validate with a random unknown key returns HTTP 401 — not { valid: true }
  4. Calling /api/webhook/avatar-ready without a valid INTERNAL_SERVICE_TOKEN returns 401
**Plans**: TBD
**UI hint**: no

---

### Phase 3: API Key Security
**Goal**: Provider credentials never appear in URLs, logs, or the frontend bundle at any point in the request lifecycle
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: KEY-01, KEY-02, KEY-03, KEY-04
**Success Criteria** (what must be TRUE):
  1. A try-on request produces no URL containing TNB_API_KEY in server access logs or Cloudflare analytics — the key travels only as a request header
  2. Triggering a deliberate error in any API route produces log output with no credential strings (TNB, OpenAI, R2, Supabase service role key)
  3. The log sanitization utility is imported and applied in every file under frontend/src/app/api/
  4. A Next.js bundle analysis shows no provider secrets present in any client-side chunk
**Plans**: TBD
**UI hint**: no

---

### Phase 4: Upload Security
**Goal**: The upload endpoint rejects non-image files regardless of what the client claims about file type or filename
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: UPL-01, UPL-02, UPL-03, UPL-04, UPL-05
**Success Criteria** (what must be TRUE):
  1. Uploading a file with image/jpeg Content-Type but PNG magic bytes is rejected with a 415 (type mismatch caught by magic bytes check)
  2. Uploading a file with a non-allowlisted MIME type (e.g. application/pdf) is rejected with a 415 even if the magic bytes match an image
  3. Uploading a file with a path-traversal filename (e.g. ../../etc/passwd.jpg) is sanitized or rejected — the stored filename contains no directory separators or traversal sequences
  4. Uploading a file over 10MB is rejected with a 413 consistently regardless of upload method
**Plans**: TBD
**UI hint**: no

---

### Phase 5: Deployment Hardening
**Goal**: The application can be built and run reproducibly in isolation without manual environment setup steps
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: DEP-01, DEP-02, DEP-03, DEP-04, DEP-05
**Success Criteria** (what must be TRUE):
  1. Running docker build against the frontend Dockerfile produces a working Next.js image with a non-root user
  2. Running docker build against the backend Dockerfile produces a working FastAPI image with a non-root user
  3. Running docker-compose up -f docker-compose.dev.yml starts both services and they can communicate with each other
  4. Running the startup validation script with a missing required env var exits non-zero and names the missing variable
**Plans**: TBD
**UI hint**: no

---

### Phase 6: CI/CD Pipelines
**Goal**: Every pull request is automatically validated for code quality, types, tests, and build — and no workflow can trigger a production deployment
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: CI-01, CI-02, CI-03, CI-04, CI-05
**Success Criteria** (what must be TRUE):
  1. Opening a pull request triggers all four workflow checks (lint, typecheck, test, build) and GitHub reports their status on the PR
  2. Introducing a TypeScript type error into the codebase causes the typecheck workflow to fail with a non-zero exit code
  3. Introducing a failing test causes the test workflow to fail and block merge
  4. Inspecting all workflow files confirms no step contains a deploy, push, or release action targeting production
**Plans**: TBD
**UI hint**: no

---

### Phase 7: Observability
**Goal**: Every error and AI provider failure in production is captured with enough context to diagnose and reproduce without access to raw server logs
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: OBS-01, OBS-02, OBS-03, OBS-04, OBS-05, OBS-06
**Success Criteria** (what must be TRUE):
  1. A runtime error thrown in any Next.js API route appears in the Sentry dashboard with route name, request ID, and stack trace
  2. A failed TNB or OpenAI API call is captured in Sentry with userId, endpoint, and duration attached as context
  3. Every API route response includes an x-request-id header and the same ID appears in the structured log entry for that request
  4. No API route uses console.log or console.error directly — all log output goes through the structured logger utility
**Plans**: TBD
**UI hint**: no

---

### Phase 8: Security Documentation
**Goal**: The security posture, infrastructure, deployment process, and rollback procedure are fully documented so the system can be audited, operated, and recovered by anyone with the docs
**Mode:** mvp
**Depends on**: Phase 7
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05
**Success Criteria** (what must be TRUE):
  1. SECURITY-AUDIT.md lists every vulnerability identified in the CONCERNS.md audit with severity, affected file(s), and current status (fixed in phase N or deferred)
  2. INFRA-ARCH.md contains a component diagram showing all services (Next.js, FastAPI, Supabase, Cloudflare R2) and the data flows between them
  3. DEPLOY.md provides step-by-step instructions sufficient for a new operator to deploy both services from scratch on Vercel + a Python host
  4. ENV-REQUIREMENTS.md documents every environment variable from STACK.md with type, required/optional flag, and a non-secret example value
**Plans**: TBD
**UI hint**: no

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. SSRF Prevention | 0/? | Not started | - |
| 2. Internal Service Auth | 0/? | Not started | - |
| 3. API Key Security | 0/? | Not started | - |
| 4. Upload Security | 0/? | Not started | - |
| 5. Deployment Hardening | 0/? | Not started | - |
| 6. CI/CD Pipelines | 0/? | Not started | - |
| 7. Observability | 0/? | Not started | - |
| 8. Security Documentation | 0/? | Not started | - |

---

*Roadmap created: 2026-05-14*

---
---

# VEXA AI Infrastructure Scale — Roadmap

**Milestone:** v2.0 AI Infrastructure Scale
**Mode:** MVP — each phase delivers one complete infrastructure capability without changing user-facing behavior
**Granularity:** Standard
**Coverage:** 37/37 requirements mapped

---

## Phases

- [ ] **Phase 9: Provider Abstraction Layer** — Unified AIProvider interface with adapters for TNB, OpenAI, Meshy, and BlackBox; provider registry with capability-based routing
- [ ] **Phase 10: Job Queue System** — Redis + BullMQ async queues for video, avatar, and Meshy; polling endpoint; synchronous try-on preserved unchanged
- [ ] **Phase 11: Retries + Failover** — Exponential backoff utility, per-provider retry config, cross-provider failover, timeout enforcement, graceful degradation
- [ ] **Phase 12: Caching** — Redis-backed cache with in-memory fallback; generation result cache, image resolution cache, upload deduplication, cache bypass header
- [ ] **Phase 13: Cost Protection** — Per-call usage tracking, daily AI call budget, duplicate request detection, burst limiter, hedging concurrency cap
- [ ] **Phase 14: AI Infra Documentation** — Architecture diagram, provider map, retry strategy doc, scaling recommendations

---

## Phase Details

### Phase 9: Provider Abstraction Layer
**Goal**: All AI provider calls route through a single typed interface so any provider can be swapped or added without touching call sites
**Mode:** mvp
**Depends on**: Nothing (first phase of v2.0; can run parallel with Phase 10)
**Requirements**: PROV-01, PROV-02, PROV-03, PROV-04, PROV-05, PROV-06, PROV-07
**Success Criteria** (what must be TRUE):
  1. A call to the TNB adapter via the AIProvider interface returns the same response shape as the previous direct callTNB invocation — existing try-on output is byte-identical
  2. The provider registry can be queried for the 'tryon' capability and returns an ordered list with TNB as primary; swapping providers requires only a registry config change, not route edits
  3. Calling health check on any registered provider returns { healthy: boolean, latencyMs: number } without throwing
  4. Adding a new provider adapter requires only implementing the AIProvider interface and registering it — no changes to any API route files
**Plans**: TBD
**UI hint**: no

---

### Phase 10: Job Queue System
**Goal**: Long-running AI operations (video try-on, SMPL-X avatar, Meshy model gen) are enqueued and polled rather than blocking the HTTP connection, while image try-on stays synchronous
**Mode:** mvp
**Depends on**: Nothing (first phase of v2.0; can run parallel with Phase 9)
**Requirements**: JOB-01, JOB-02, JOB-03, JOB-04, JOB-05, JOB-06, JOB-07, JOB-08
**Success Criteria** (what must be TRUE):
  1. A POST to /api/tryon/video returns { jobId, status: "queued" } immediately (under 500ms) instead of blocking for the full video generation duration
  2. A GET to /api/jobs/[jobId] returns { status: "completed", result: { ... } } once the worker finishes — the result shape matches what the old synchronous endpoint returned
  3. A POST to /api/tryon (image) still returns a synchronous result with no jobId — the async system is completely transparent to this path
  4. Shutting down Redis with a job in flight causes the worker to fail gracefully (job marked failed, not silently dropped) and the polling endpoint returns { status: "failed", error: "..." }
**Plans**: TBD
**UI hint**: no

---

### Phase 11: Retries + Failover
**Goal**: Transient AI provider failures are recovered automatically; total failure surfaces a structured error immediately rather than hanging or crashing
**Mode:** mvp
**Depends on**: Phase 9, Phase 10
**Requirements**: RETRY-01, RETRY-02, RETRY-03, RETRY-04, RETRY-05, RETRY-06
**Success Criteria** (what must be TRUE):
  1. Simulating two consecutive TNB 503 errors results in a third automatic retry after exponential backoff — the caller receives a successful response without any application-level retry logic at the call site
  2. Exhausting all TNB retries triggers automatic failover to the next provider in the registry capability list — the response shape is unchanged
  3. A provider call that exceeds its configured timeout is aborted and counted as a failed attempt (not left hanging as an open connection)
  4. When all providers for a capability are exhausted, the route returns { error: string, retryAfter: number, fallbackAvailable: false } with an appropriate 503 status — never a silent hang or unhandled promise rejection
**Plans**: TBD
**UI hint**: no

---

### Phase 12: Caching
**Goal**: Duplicate AI requests and redundant uploads are eliminated at the infrastructure level — identical inputs return cached results without touching any provider
**Mode:** mvp
**Depends on**: Phase 10, Phase 11
**Requirements**: CACHE-01, CACHE-02, CACHE-03, CACHE-04, CACHE-05, CACHE-06
**Success Criteria** (what must be TRUE):
  1. Submitting the same person image + garment image + category combination twice within 24 hours returns the cached result on the second call — no outbound TNB request is made and response time is under 100ms
  2. Uploading the same file bytes twice results in one R2 object — the second upload returns the existing URL without performing a PUT to R2
  3. Sending x-cache-bypass: true on a request that would otherwise hit cache causes a fresh provider call and updates the cached value
  4. Restarting the Next.js process with Redis unavailable causes the cache layer to fall back to in-memory LRU with no error thrown to the caller
**Plans**: TBD
**UI hint**: no

---

### Phase 13: Cost Protection
**Goal**: No single user or runaway process can exhaust AI provider budgets — usage is tracked per call and enforced at both rate and daily limits
**Mode:** mvp
**Depends on**: Phase 11, Phase 12
**Requirements**: COST-01, COST-02, COST-03, COST-04, COST-05, COST-06
**Success Criteria** (what must be TRUE):
  1. A user who submits 21 AI requests in a single day receives a 429 on the 21st request with a message indicating the daily limit — the 20th request succeeds normally
  2. A user who submits 6 AI requests within 10 seconds receives a 429 on the 6th — burst limiter fires before the daily budget check
  3. Submitting an identical request fingerprint twice within 5 seconds from the same user returns the in-flight result on the second call — only one provider invocation occurs
  4. Each AI call produces a log entry containing: provider name, endpoint, userId, estimated cost in USD, and timestamp — verifiable in structured logs
**Plans**: TBD
**UI hint**: no

---

### Phase 14: AI Infra Documentation
**Goal**: The async queue topology, provider abstraction, retry policy, and scaling parameters are documented so any engineer can operate, extend, or tune the AI infrastructure from the docs alone
**Mode:** mvp
**Depends on**: Phase 9, Phase 10, Phase 11, Phase 12, Phase 13
**Requirements**: AIDOC-01, AIDOC-02, AIDOC-03, AIDOC-04
**Success Criteria** (what must be TRUE):
  1. AI-INFRA-ARCH.md contains a component diagram identifying every queue, worker, provider adapter, cache layer, and the data flow connecting them — readable without access to source code
  2. PROVIDER-MAP.md lists every registered provider with its capability, fallback chain position, estimated cost per call, and the environment variable that configures it
  3. RETRY-STRATEGY.md specifies the exact backoff parameters (base delay, max attempts, jitter) and failover trigger conditions for each provider — sufficient to reproduce the policy in a different language
  4. SCALING-RECOMMENDATIONS.md gives concrete Redis sizing targets, recommended worker concurrency per queue, and projected monthly cost at 1k/10k/100k daily request volumes
**Plans**: TBD
**UI hint**: no

---

## Progress Table (v2.0)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 9. Provider Abstraction Layer | 0/? | Not started | - |
| 10. Job Queue System | 0/? | Not started | - |
| 11. Retries + Failover | 0/? | Not started | - |
| 12. Caching | 0/? | Not started | - |
| 13. Cost Protection | 0/? | Not started | - |
| 14. AI Infra Documentation | 0/? | Not started | - |

---

*v2.0 roadmap appended: 2026-05-14*

---
---

# VEXA Frontend Performance — Roadmap

**Milestone:** v3.0 Frontend Performance
**Mode:** MVP — each phase delivers one complete frontend performance capability; zero regression on existing API flows and user-facing behavior
**Granularity:** Standard
**Coverage:** 25/25 requirements mapped

---

## Phases

- [x] **Phase 15: Feature-Based Structure** — Additive barrel re-exports for all five feature domains; zero file moves; all existing imports unchanged
- [x] **Phase 16: Mobile Performance** — Dynamic imports with SSR disabled, device capability detection, lazy image loading, Next.js config optimizations
- [x] **Phase 17: 3D Optimization** — Draco decoder config, progressive GLB loading with progress events, mobile GPU frame controls; all 3D stays client-only
- [x] **Phase 18: Frontend API Layer** — Typed apiClient with error normalization, full method coverage, useApiCall hook; zero collision with existing types
- [x] **Phase 19: State Management Cleanup** — Centralized loading/error slices in Zustand, typed selector hooks, barrel export; all existing state untouched
- [x] **Phase 20: Performance Reports** — Bundle analysis, mobile readiness matrix, performance before/after table, frontend architecture map

---

## Phase Details

### Phase 15: Feature-Based Structure
**Goal**: Developers can import any feature component or hook from a single barrel path without any existing import in the codebase being broken or moved
**Mode:** mvp
**Depends on**: Nothing (first phase of v3.0)
**Requirements**: FEAT-01, FEAT-02, FEAT-03, FEAT-04, FEAT-05, FEAT-06, FEAT-07
**Success Criteria** (what must be TRUE):
  1. `import { useTryOn, TryOnResult } from '@/features/tryon'` resolves correctly — no existing file is moved or renamed
  2. `import { AvatarViewer } from '@/features/avatar'` resolves correctly alongside the original import path, which continues to work
  3. `import { supabase, useUser } from '@/features/auth'` resolves correctly
  4. `import { ImageUploadBox } from '@/features/studio'` and `import { useStore } from '@/features/dashboard'` both resolve correctly
  5. A single `import { ... } from '@/features'` top-level barrel re-exports all five feature namespaces without circular dependency errors
**Plans**: Complete
**UI hint**: yes

---

### Phase 16: Mobile Performance
**Goal**: Heavy UI components load only when needed and the application adapts rendering fidelity to the user's device capability — without changing /api/tryon or any server-side behavior
**Mode:** mvp
**Depends on**: Phase 15
**Requirements**: MOB-01, MOB-02, MOB-03, MOB-04, MOB-05
**Success Criteria** (what must be TRUE):
  1. AvatarViewer, ARTryOn, VideoTryOn, and Spline components are imported via SSR-disabled dynamic wrappers — none of them appear in the server-rendered HTML
  2. `useDeviceCapability()` returns correct values for isMobile, isLowEndDevice, prefersReducedMotion, connectionType, and supportsWebGL in a browser environment
  3. LazyImage renders a skeleton placeholder until the image enters the viewport, then loads the full image with no layout shift
  4. The Next.js build completes with compress, swcMinify, and optimizePackageImports for three/r3f/drei active — bundle size for the 3D chunk is reduced versus baseline
  5. The browser tab on mobile shows the correct theme color from the themeColor metadata added to layout.tsx
**Plans**: Complete
**UI hint**: yes

---

### Phase 17: 3D Optimization
**Goal**: 3D avatar content loads progressively with visible progress feedback, uses Draco compression where available, and does not exhaust mobile GPU resources — all 3D components remain client-only with ssr: false
**Mode:** mvp
**Depends on**: Phase 15, Phase 16
**Requirements**: THREED-01, THREED-02, THREED-03, THREED-04, THREED-05
**Success Criteria** (what must be TRUE):
  1. GLB files are served through the Draco decoder path — `configureDracoDecoder()` is called before any DRACOLoader instantiation and DRACO_DECODER_PATH resolves correctly
  2. `getTextureQuality()` returns 'low', 'medium', or 'high' based on the detected device tier — low-end devices receive downsampled textures
  3. `useProgressiveGlb()` emits progress values between 0 and 1 during XHR fetch — GlbLoadingIndicator renders a progress bar that advances visibly before the model appears
  4. AvatarViewer Canvas uses `frameloop="demand"` so frames are only rendered on state change — GPU utilization is idle when the avatar is static
  5. On a simulated low-end device, AvatarViewer Canvas uses `performance={{ min: 0.5 }}` — Three.js pixel ratio scales down under GPU pressure
**Plans**: Complete
**UI hint**: yes

---

### Phase 18: Frontend API Layer
**Goal**: All client-to-server communication goes through a single typed apiClient with consistent error handling — no component calls fetch() directly against /api routes
**Mode:** mvp
**Depends on**: Phase 15
**Requirements**: API-01, API-02, API-03, API-04, API-05
**Success Criteria** (what must be TRUE):
  1. `api.tryOn(...)`, `api.uploadPhoto(...)`, `api.generateAvatar(...)`, `api.getJobStatus(...)`, `api.pollJobUntilComplete(...)`, `api.validateApiKey(...)`, `api.generateDesign(...)`, and `api.healthCheck()` all exist on the exported `api` object with full TypeScript types
  2. A network error or non-2xx response from any api method throws an `ApiError` instance with `status`, `message`, and `data` fields — never a raw fetch rejection or untyped error
  3. `useApiCall(fn)` returns `{ loading, error, data, execute }` — calling `execute()` sets loading to true, then resolves to data or error with no unhandled promise rejection
  4. Importing from `@/lib/apiClient` introduces zero type conflicts with existing types — `StudioDesignApiResponse` does not collide with any prior `DesignResponse` usage
**Plans**: Complete
**UI hint**: no

---

### Phase 19: State Management Cleanup
**Goal**: Loading and error states for all async operations are managed centrally in the Zustand store via typed selector hooks — no component maintains its own ad-hoc loading/error useState pairs for operations that touch the store
**Mode:** mvp
**Depends on**: Phase 15, Phase 18
**Requirements**: STATE-01, STATE-02, STATE-03, STATE-04
**Success Criteria** (what must be TRUE):
  1. `useStore.getState().setLoading('tryon', true)` sets the loading flag; `isLoading('tryon')` returns true; all pre-existing store state (userImage, currentUser, tryOnResult, favorites) is unchanged
  2. `setError('upload', 'File too large')` stores the error; `clearError('upload')` removes it; `clearAllErrors()` removes all errors — no existing state slice is affected
  3. `useTryOnState()`, `useTryOnActions()`, `useAuthState()`, `useAuthActions()`, `useFavorites()`, `useFavoriteActions()`, `useLoadingState()`, `useErrorState()`, and `useLoadingActions()` all import cleanly from `@/store` without error
  4. `import { useStore } from '@/store'` and `import { LOADING_KEYS } from '@/store'` both resolve via the barrel — no direct import of `useStore.ts` or `selectors.ts` is required
**Plans**: Complete
**UI hint**: yes

---

### Phase 20: Performance Reports
**Goal**: The frontend performance baseline, mobile readiness status, bundle composition, and architecture conventions are documented so any engineer can identify bottlenecks, verify improvements, and understand the layer rules
**Mode:** mvp
**Depends on**: Phase 15, Phase 16, Phase 17, Phase 18, Phase 19
**Requirements**: REPORT-01, REPORT-02, REPORT-03, REPORT-04
**Success Criteria** (what must be TRUE):
  1. `docs/PERFORMANCE-REPORT.md` contains a before/after table with at least LCP, FID/INP, and CLS values for the studio page — and documents which phase delivered each improvement
  2. `docs/MOBILE-READINESS.md` contains a capability matrix showing which features are available on low-end vs. high-end mobile devices, plus a checklist of remaining TODOs
  3. `docs/BUNDLE-ANALYSIS.md` identifies the largest chunks by estimated size, lists which are lazy-loaded, and includes instructions for running the Next.js bundle analyzer locally
  4. `docs/FRONTEND-ARCH.md` contains the full `frontend/src/` directory tree annotated by layer, a data flow diagram from user action to API response, the Zustand state map, and the layer rules (what may import what)
**Plans**: Complete
**UI hint**: yes

---

## Progress Table (v3.0)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 15. Feature-Based Structure | 7/7 | Complete | 2026-05-14 |
| 16. Mobile Performance | 5/5 | Complete | 2026-05-14 |
| 17. 3D Optimization | 5/5 | Complete | 2026-05-14 |
| 18. Frontend API Layer | 5/5 | Complete | 2026-05-14 |
| 19. State Management Cleanup | 4/4 | Complete | 2026-05-14 |
| 20. Performance Reports | 4/4 | Complete | 2026-05-14 |

---

*v3.0 roadmap appended: 2026-05-14*
