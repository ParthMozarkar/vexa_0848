# Codebase Concerns

**Analysis Date:** 2026-05-13

---

## Security Considerations

### SSRF via Unrestricted Proxy Endpoint

**Area:** Image Proxy
**Risk:** The `/api/proxy` route fetches any URL supplied by the caller with no allowlist, scheme check, or hostname restriction. An attacker can force the server to fetch internal cloud metadata endpoints (e.g., `http://169.254.169.254/`), internal services, or arbitrary hosts on the internet.
**Files:** `frontend/src/app/api/proxy/route.ts` (lines 6–14)
**Current mitigation:** None — the URL is used verbatim in a `fetch()` call.
**Recommendations:**
- Validate the URL against an explicit allowlist of permitted hostnames (reuse `image-hosts.config.mjs`).
- Reject any non-HTTPS scheme.
- Reject RFC-1918 and link-local addresses before fetching.

---

### Demo Bypass in Key Validation Makes Auth Illusory

**Area:** API Key Authentication
**Risk:** `GET /api/keys/validate` returns `{ valid: true, marketplace_name: 'VEXA Demo User' }` in two cases: (1) no key is provided at all, and (2) any key that is not found in the database. This means any caller — including external attackers — gets a valid response by simply omitting the header or submitting a random string. Any downstream service that trusts this endpoint's response is effectively unauthenticated.
**Files:** `frontend/src/app/api/keys/validate/route.ts` (lines 10–11 and 33–35)
**Current mitigation:** None — the bypass is deliberate ("Demo Mode Bypass" comments).
**Recommendations:**
- Remove the two demo bypasses entirely.
- Return `{ valid: false }` with status 401 when the key is absent or not found in the database.
- If demo access is a product requirement, create a real provisioned demo key in the database.

---

### TNB API Key Exposed in HTTP Query Parameter

**Area:** Try-On AI Backend Call
**Risk:** The TheNewBlack API key is appended directly to the request URL as `?api_key=<secret>`. URLs including query parameters are routinely recorded in server access logs, Cloudflare analytics, CDN logs, and HTTP referer headers. The key is therefore leaked to any system that captures request URLs.
**Files:** `frontend/src/app/api/tryon/route.ts` (line 183)
**Current mitigation:** None — the key is in the URL for every call.
**Recommendations:**
- Move the key to an `Authorization` or `X-API-Key` HTTP header.
- Rotate the key after this change is deployed.

---

### Backend INTERNAL_SERVICE_TOKEN Silent Bypass in Production

**Area:** Python Avatar Service Auth
**Risk:** `backend/main.py` `verify_internal_token()` explicitly allows all requests when `INTERNAL_SERVICE_TOKEN` is not set in the environment, logging only a warning. If the variable is accidentally unset in a production deployment, every endpoint on the Python service becomes publicly accessible without credentials.
**Files:** `backend/main.py` (lines 51–55)
**Current mitigation:** A `logger.warning()` call — no enforcement.
**Recommendations:**
- Raise a startup `ValueError` or call `sys.exit(1)` when the token is missing in a non-dev environment.
- Add an `ENVIRONMENT` env check: only allow the bypass when `ENVIRONMENT=development`.

---

### Webhook Endpoint Has the Same INTERNAL_SERVICE_TOKEN Gap

**Area:** Avatar-Ready Webhook
**Risk:** `/api/webhook/avatar-ready` refuses requests when `internalSecret` is falsy (line 9: `if (!internalSecret || ...)`). This is correct. However, the same Python service that calls this webhook silently runs unauthenticated when `INTERNAL_SERVICE_TOKEN` is unset (see concern above), so a misconfigured deploy results in an open webhook accepting arbitrary `{ userId, avatarUrl }` payloads and overwriting any user's avatar URL.
**Files:** `frontend/src/app/api/webhook/avatar-ready/route.ts` (lines 7–10), `backend/main.py` (lines 51–55)
**Current mitigation:** Webhook correctly requires the token; risk is indirect through backend misconfiguration.
**Recommendations:**
- Fix the Python service startup check (see above).
- Add a HMAC signature on the webhook body for additional defense-in-depth.

---

### File Upload MIME Type Trusts User-Controlled `file.type`

**Area:** Upload Endpoint
**Risk:** The upload route checks `file.type.startsWith('image/')` to validate uploads. `file.type` is the browser-supplied MIME type from the `Content-Type` field of the multipart form — it is entirely controlled by the client. An attacker can rename an executable or HTML file to `.jpg`, set `Content-Type: image/jpeg`, and upload it successfully. The stored file is then served back with whatever content-type was stored.
**Files:** `frontend/src/app/api/upload/route.ts` (lines 53–55)
**Current mitigation:** Size limit (10 MB) is enforced.
**Recommendations:**
- Inspect the first bytes of the buffer (magic bytes) to verify the actual file type using a library such as `file-type`.
- Strip EXIF metadata before storage to prevent metadata-based attacks.

---

### Dashboard Analytics and Stats Endpoints Are Unauthenticated

**Area:** Dashboard / Analytics
**Risk:** `GET /api/dashboard/stats` and `GET /api/dashboard/analytics` return aggregate platform-wide metrics (total users, total keys, total try-ons, daily volumes, API key usage) with no authentication check of any kind. Any unauthenticated caller can retrieve this business data.
**Files:** `frontend/src/app/api/dashboard/stats/route.ts` (entire file), `frontend/src/app/api/dashboard/analytics/route.ts` (entire file)
**Current mitigation:** None.
**Recommendations:**
- Protect both routes with `VEXA_ADMIN_KEY` (same pattern as `/api/keys/generate`), or require a valid Supabase session with a verified admin role.

---

### Studio Routes Have No Authentication

**Area:** Studio AI Generation
**Risk:** `POST /api/studio/design`, `POST /api/studio/model-gen`, `POST /api/studio/video-gen`, and `POST /api/studio/trends` are callable by anyone without a valid user session or marketplace key. Only the `design` route has IP-based rate limiting; `model-gen`, `video-gen`, and `trends` have no rate limiting or auth at all. An attacker can exhaust `OPENAI_API_KEY`, `BLACKBOX_API_KEY`, and `ANAKIN_API_KEY` quotas freely.
**Files:**
- `frontend/src/app/api/studio/model-gen/route.ts` (no auth, no rate limit)
- `frontend/src/app/api/studio/video-gen/route.ts` (no auth, no rate limit)
- `frontend/src/app/api/studio/trends/route.ts` (no auth, no rate limit)
- `frontend/src/app/api/studio/design/route.ts` (no auth, IP rate limit only)
**Current mitigation:** `design` has IP rate limiting; the others have nothing.
**Recommendations:**
- Require a valid Supabase Bearer token or `x-vexa-key` for all studio endpoints.
- Apply consistent IP rate limiting across all four routes.

---

### IP Rate Limiting Bypassable via X-Forwarded-For Header Spoofing

**Area:** Rate Limiting
**Risk:** `getClientIp()` in `frontend/src/lib/ipRateLimit.ts` blindly trusts the first value of the `x-forwarded-for` header (line 19). If the app is deployed behind a proxy that does not strip or overwrite this header, any caller can set `X-Forwarded-For: 127.0.0.1` to claim the localhost address, which is always whitelisted (line 40), bypassing all rate limits entirely. There is a duplicate implementation in `frontend/src/lib/rateLimit.ts` with the same flaw.
**Files:** `frontend/src/lib/ipRateLimit.ts` (lines 17–25), `frontend/src/lib/rateLimit.ts` (lines 10–14)
**Current mitigation:** None for spoofing; Cloudflare `cf-connecting-ip` is checked as a secondary option in `ipRateLimit.ts` only.
**Recommendations:**
- On Cloudflare-fronted deployments, use only `cf-connecting-ip` and discard `x-forwarded-for`.
- Remove the `127.0.0.1` and `::1` whitelist or restrict it to explicitly configured environments.

---

### Unauthenticated Guest Try-On Writes Arbitrary Users to Database

**Area:** Try-On Authentication Fallback
**Risk:** When no Bearer token and no `x-vexa-key` is present, `authenticateRequest()` in `/api/tryon/route.ts` uses the caller-supplied `userId` from the request body (or falls back to the hardcoded string `'demo_user_001'`) and immediately upserts a user record with `email: ${userId}@vexa.guest`. A caller can therefore fabricate any UUID as their `userId`, trigger a DB upsert for a real user's ID, and associate try-on results with that account.
**Files:** `frontend/src/app/api/tryon/route.ts` (lines 59–63)
**Current mitigation:** None — the upsert uses the caller-controlled value directly.
**Recommendations:**
- Require authentication (Bearer token or valid `x-vexa-key`) for all try-on requests in production.
- If guest mode is required for the demo, generate a server-side anonymous ID rather than accepting one from the client.

---

### Email Confirmation Bypassed at Signup

**Area:** Authentication
**Risk:** `/api/auth/signup` uses `supabase.auth.admin.createUser({ email_confirm: true })`, which marks the email as confirmed at creation time, bypassing Supabase's email verification flow entirely. Users can sign up with arbitrary email addresses (including ones they do not own) and immediately have a fully confirmed account.
**Files:** `frontend/src/app/api/auth/signup/route.ts` (lines 74–78)
**Current mitigation:** None.
**Recommendations:**
- Remove `email_confirm: true` and allow Supabase to send the standard confirmation email.
- If instant access is a product requirement, at minimum validate email format before creation.

---

### Clothing Status Endpoint Has No Authentication

**Area:** 3D Asset Pipeline
**Risk:** `GET /api/clothing/status/[taskId]` polls the Meshy API and updates Supabase with the resulting GLB URL using no authentication. Anyone who knows or guesses a Meshy task ID can trigger an update of the `clothing_assets` table for that task.
**Files:** `frontend/src/app/api/clothing/status/[taskId]/route.ts` (entire file)
**Current mitigation:** None.
**Recommendations:**
- Require a valid Supabase Bearer token and verify the requesting user owns the task before polling Meshy.

---

## Tech Debt

### Duplicate Rate Limiting Implementations

**Area:** Rate Limiting Infrastructure
- Issue: Two separate, divergent rate-limit libraries exist side-by-side. `src/lib/ipRateLimit.ts` is the active one (used by `/api/tryon` and `/api/studio/design`). `src/lib/rateLimit.ts` is a second implementation with different logic and an RPC fallback path. Neither file imports the other. The active one does not use the atomic RPC increment; the unused one does.
- Files: `frontend/src/lib/ipRateLimit.ts`, `frontend/src/lib/rateLimit.ts`
- Impact: Maintenance confusion; risk that a developer adds a new route using the wrong file. The non-atomic increment in `ipRateLimit.ts` has a read-modify-write race condition that can allow extra requests at high concurrency.
- Fix approach: Delete `rateLimit.ts`, migrate `ipRateLimit.ts` to use the atomic RPC increment (`increment_ip_usage`), and add a `'unknown'` IP guard that blocks rather than whitelists.

---

### Hardcoded Fit Metadata in Core Try-On Path

**Area:** Try-On Engine
- Issue: `handleTryOn()` always returns `fitLabel: 'True to size'`, `recommendedSize: 'M'`, and `fitScore: 85` regardless of the user's measurements or product size chart. The DB row also always stores `fit_label: 'True to size'` and `recommended_size: 'M'`.
- Files: `frontend/src/app/api/tryon/route.ts` (lines 263–271)
- Impact: Fit recommendations are meaningless for all users; the fit engine (`getFitRecommendation`, `getFitScore` in `src/lib/fitEngine.ts`) exists but is not called from this path.
- Fix approach: Pass user measurements and size chart into `handleTryOn` and call `getFitRecommendation` before returning.

---

### `as any` Type Suppressions Bypassing Type Safety

**Area:** Type System
- Issue: Multiple server routes cast Supabase queries `as any` to work around missing or incorrect generated types. These are not isolated to tests.
- Files:
  - `frontend/src/app/api/tryon/route.ts` (lines 46, 256) — upserts users and tryon_results
  - `frontend/src/app/api/studio/design/route.ts` (line 184) — inserts design_history
  - `frontend/src/app/api/clothing/route.ts` (lines 157, 165) — upserts clothing_assets
  - `frontend/src/app/api/upload/route.ts` (line 36) — auth user cast
- Impact: Type errors in these paths will be silently swallowed rather than caught at build time.
- Fix approach: Regenerate Supabase types (`npx supabase gen types typescript`) and remove all `as any` casts.

---

### TypeScript Build Errors and ESLint Suppressed in Production

**Area:** Build Quality
- Issue: `next.config.mjs` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`. This means the production build ships regardless of type errors or lint violations.
- Files: `frontend/next.config.mjs` (lines 11, 15)
- Impact: Regressions that would be caught at build time are silently deployed. This also makes the `as any` suppressions above harder to discover.
- Fix approach: Remove both flags. Fix the underlying type errors and lint violations. Re-enable as a CI gate.

---

### `process-video` Route Missing from Python Backend

**Area:** Video Try-On Pipeline
- Issue: The Next.js video try-on route fires a `fetch` to `${pyUrl}/process-video` to dispatch video jobs to the Python service, but `backend/main.py` registers no `/process-video` endpoint. The dispatch silently fails (`.catch()` only logs the error) and video jobs remain permanently stuck at `status: 'processing'`.
- Files: `frontend/src/app/api/tryon/video/route.ts` (lines 104–114), `backend/main.py` (no `/process-video` route)
- Impact: Video try-on feature is non-functional end-to-end.
- Fix approach: Implement `/process-video` in `backend/main.py` calling `pipeline/video_processor.py:process_video()`, or update the job dispatch mechanism.

---

### Heatmap Generation Stubbed with `null`

**Area:** Try-On Result Quality
- Issue: `POST /api/tryon/[productId]` always returns `heatmapUrl: null` with a `TODO` comment indicating the real implementation was never built.
- Files: `frontend/src/app/api/tryon/[productId]/route.ts` (lines 74–75)
- Impact: Downstream consumers that expect heatmap data receive null permanently; the feature does not function.
- Fix approach: Implement heatmap generation in the Python inference service and wire it through the response, or remove the field from the response type if the feature is deferred.

---

## Performance Bottlenecks

### Batch Try-On Processes Products Serially

**Area:** Batch Try-On
- Problem: `POST /api/tryon/batch` iterates over the `products` array with a sequential `for` loop, calling the full `handleTryOn` (which includes TNB API calls) one product at a time. Each call takes 5–15 seconds.
- Files: `frontend/src/app/api/tryon/batch/route.ts` (lines 55–98)
- Cause: `for...of` loop with `await` inside prevents parallelism.
- Improvement path: Replace with `Promise.all(products.map(...))` or a concurrency-limited pool (e.g., `p-limit`) with a cap of 3 concurrent requests to stay within TNB rate limits.

---

### Non-Atomic Rate Limit Increment Creates Race Condition

**Area:** Rate Limiting
- Problem: `incrementIpCount()` does a `SELECT count` followed by `UPDATE count + 1` in two separate round-trips. Concurrent requests from the same IP can read the same count before either write completes, allowing more than the limit.
- Files: `frontend/src/lib/ipRateLimit.ts` (lines 94–113)
- Cause: Non-atomic read-modify-write; no database-level row locking.
- Improvement path: Use the existing `increment_ip_usage` Supabase RPC (already referenced in the unused `rateLimit.ts`) which performs an atomic increment.

---

### Supabase Client Instantiated on Every Request

**Area:** Backend Database Layer
- Problem: Every API route call constructs a new `createClient(...)` instance rather than reusing a module-level singleton. The Supabase JS client is lightweight but this still generates redundant object allocations on every hot path.
- Files: All 20+ routes in `frontend/src/app/api/` (each file defines its own `getServiceSupabase()` or `getSupabase()` factory).
- Cause: No shared client module; each route duplicates the factory pattern.
- Improvement path: Create a `src/lib/supabase-server.ts` singleton export for the service-role client and import it across routes.

---

## Fragile Areas

### `face_texture.py` Uses `urllib.request.urlopen` Without Validation

**Area:** Python Pipeline
- Files: `backend/pipeline/face_texture.py` (lines 20–22)
- Why fragile: `urllib.request.urlopen` fetches any URL including internal addresses; no timeout is set for the `else` branch URL fetch (the `timeout=30` param is listed but not passed to `urlopen`); if the returned bytes are not a valid image, `cv2.imdecode` returns `None` which is caught correctly — but if the URL hangs indefinitely, the entire pipeline thread blocks.
- Safe modification: Replace `urllib.request.urlopen` with `requests.get(url, timeout=30, stream=True)` and add a max-bytes guard.
- Test coverage: No tests for `face_texture.py`.

---

### `video_processor.py` Has No Frame Count Cap

**Area:** Video Try-On Pipeline
- Files: `backend/pipeline/video_processor.py` (lines 43–48)
- Why fragile: A long video at high FPS extracts unbounded frames into memory (`frames: list[np.ndarray]`). Each frame is then sent to the Hugging Face IDM-VTON API synchronously. A 60-second 30 FPS video with `frame_interval=3` yields 600 frames, each requiring a 120-second timeout API call — this will run for hours and exhaust memory.
- Safe modification: Cap `frames` to a maximum (e.g., 30 frames), add a video duration limit check before extraction.
- Test coverage: No integration tests for video processor.

---

## Known Bugs

### Supabase Non-Null Assertion on Missing Env Vars in `tryon/batch`

**Symptoms:** If `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, the server crashes with an unhandled `TypeError: createClient called with undefined` instead of returning a proper 500.
**Files:** `frontend/src/app/api/tryon/batch/route.ts` (line 26)
**Trigger:** Deploy without required Supabase env vars set.
**Workaround:** Same env-var check pattern used in all other routes exists but is missing here — the batch route uses `!` non-null assertions without guards.

---

### `bookings` Route Uses Module-Level Supabase Client with Anon Key Only

**Symptoms:** The booking GET/POST route creates a single Supabase client at module load time using the anon key (not the service-role key). This means RLS policies apply to booking reads/writes. Any RLS misconfiguration on the `bookings` table silently drops inserts without error.
**Files:** `frontend/src/app/api/bookings/route.ts` (lines 6–7, 10)
**Trigger:** Insert fails silently when `dbError` is thrown but caught generically; the calendar/email automation error is also suppressed.
**Workaround:** Use the service-role key for server-side booking inserts, consistent with all other write routes.

---

## Scaling Limits

### IP Rate Limit Table Grows Unboundedly

**Resource:** `ip_usage_limits` Supabase table
- Current capacity: No cleanup mechanism exists; every unique IP address gets a permanent row.
- Limit: At scale (millions of visitors) the table will grow very large and scans without indexes will degrade `checkIpLimit` latency significantly.
- Scaling path: Add a scheduled job (Supabase pg_cron or a cron API route) to delete rows where `last_reset` is more than 48 hours old.

---

## Dependencies at Risk

### Hardcoded Hugging Face IDM-VTON Inference URL

**Package/Service:** `HF_IDM_VTON_URL` in `backend/pipeline/video_processor.py`
- Risk: The HuggingFace Inference API URL for `yisol/IDM-VTON` is hardcoded as a module constant with no environment variable override. If the model is removed, moved, or rate-limited, the entire video try-on pipeline fails with no configuration escape hatch.
- Impact: Video try-on breaks without a code change.
- Migration plan: Move to an env var `HF_IDM_VTON_URL` with the current value as default; document alternative self-hosted endpoint.

---

## Missing Critical Features

### No Request Signing on Webhook Callbacks

- Problem: `/api/webhook/avatar-ready` only checks a shared secret via `Authorization: Bearer`. There is no timestamp or HMAC body signature, making the endpoint vulnerable to replay attacks if the token is ever captured in transit.
- Blocks: Secure webhook delivery for avatar-generation callbacks.

### No Structured Logging or Request Tracing

- Problem: All server-side logging uses `console.log`/`console.error`/`console.warn` with ad-hoc string formatting. There is no correlation ID on requests, no structured JSON output, and no log level configuration.
- Blocks: Debugging production incidents; log aggregation in any observability platform.

### No Input Sanitization / Max Length on AI Prompt Fields

- Problem: `/api/studio/trends` passes the raw `query`, `style`, and `category` fields directly into the OpenAI system/user prompt without sanitization or length limits beyond a final `.slice(0, 6000)` on search content. A caller can craft adversarial prompt injections to manipulate LLM outputs.
- Files: `frontend/src/app/api/studio/trends/route.ts` (lines 107–110)
- Blocks: Safe LLM-backed features.

---

## Test Coverage Gaps

### All API Routes Are Untested

- What's not tested: Every route in `frontend/src/app/api/` — authentication logic, rate limiting, error paths, DB interaction, external API calls.
- Files: All 29 files under `frontend/src/app/api/`
- Risk: Auth bypass regressions (e.g., demo bypass in validate route) could ship undetected. Breaking changes to TNB or Meshy response formats would not be caught.
- Priority: High

### Python Pipeline Has Minimal Coverage

- What's not tested: `face_texture.py`, `video_processor.py`, `r2_uploader.py` have no tests. `test_pipeline.py` exists but covers only the body generator path.
- Files: `backend/tests/test_pipeline.py`, `backend/pipeline/face_texture.py`, `backend/pipeline/video_processor.py`
- Risk: URL-fetching paths, face detection failures, and video frame extraction edge cases are untested.
- Priority: Medium

### Security-Critical Paths Have No Tests

- What's not tested: `apiKeyMiddleware.ts` `validateApiKey()` function, `ipRateLimit.ts` concurrency behavior, `crypto.ts` `hashApiKey()` function, IDOR prevention checks in `ar/session`, `tryon/[productId]`, and `tryon/video/status`.
- Files: `frontend/src/lib/apiKeyMiddleware.ts`, `frontend/src/lib/ipRateLimit.ts`, `frontend/src/lib/crypto.ts`
- Risk: Regressions in auth or rate limiting would not be caught before deployment.
- Priority: High

---

*Concerns audit: 2026-05-13*
