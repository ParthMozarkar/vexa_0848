# VEXA Security Audit

**Audit Date:** 2026-05-13
**Project:** VEXA — AI Virtual Try-On & Avatar Platform
**Auditor:** GSD Security Review (automated codebase analysis)
**Scope:** `frontend/src/app/api/`, `frontend/src/lib/`, `backend/main.py`, `backend/pipeline/`

---

## Executive Summary

### Risk Posture Before Hardening

VEXA's codebase, prior to Phase 1–7 hardening, presented a **HIGH** overall risk posture with
three CRITICAL vulnerabilities that allowed unauthenticated write access to production data,
API key exfiltration via server logs, and full SSRF exposure of the hosting cloud environment.
Nine additional HIGH/MEDIUM vulnerabilities covered auth bypasses, file upload spoofing, open
analytics endpoints, rate-limit bypass, and Python service misconfiguration.

**Unmitigated exposure summary (pre-hardening):**
- Any internet caller could become an authenticated "demo" API client with zero credentials
- Any internet caller could associate try-on results with arbitrary user accounts
- The TheNewBlack API key (a paid third-party credential) was written to every server access log
- The cloud metadata endpoint (`169.254.169.254`) was reachable via the image proxy
- Dashboard business analytics (user counts, revenue proxies) were publicly readable
- The Python avatar service would become fully public if `INTERNAL_SERVICE_TOKEN` was unset on deploy

### Risk Posture After Hardening (Phases 1–7)

Following Phase 1–7 remediation the overall risk posture is **LOW–MEDIUM**. All CRITICAL and
HIGH findings have been resolved or have documented mitigations. The remaining open items are
MEDIUM/LOW severity tech-debt and feature gaps that do not expose live user data or credentials.

**Residual open items:**
- Hardcoded fit metadata returned from try-on (functional correctness, not a security risk)
- TypeScript `as any` casts in Supabase queries (build-time safety, not runtime exploit)
- `ignoreBuildErrors` in `next.config.mjs` (deployment quality, not direct attack surface)
- Python pipeline SSRF in `face_texture.py` (`urllib.urlopen`) — lower risk, internal-only
- `video_processor.py` frame-count resource exhaustion — DoS vector if authenticated video try-on is exposed
- Missing structured logging / request correlation IDs (observability, not security vulnerability)

---

## Vulnerability Table

| ID | Severity | Title | File:Line | Phase Fixed | Status |
|----|----------|-------|-----------|-------------|--------|
| SEC-01 | CRITICAL | SSRF via unrestricted `/api/proxy` endpoint | `frontend/src/app/api/proxy/route.ts:6–14` | Phase 1 | Fixed (Phase 1) |
| SEC-02 | CRITICAL | Demo bypass makes API key validation illusory | `frontend/src/app/api/keys/validate/route.ts:10–11,33–35` | Phase 2 | Fixed (Phase 2) |
| SEC-03 | CRITICAL | TNB API key exposed in HTTP query parameter | `frontend/src/app/api/tryon/route.ts:183` | Phase 2 | Fixed (Phase 2) |
| SEC-04 | HIGH | Python backend `INTERNAL_SERVICE_TOKEN` silent bypass | `backend/main.py:51–55` | Phase 3 | Fixed (Phase 3) |
| SEC-05 | HIGH | Unauthenticated guest try-on writes arbitrary user IDs to DB | `frontend/src/app/api/tryon/route.ts:59–63` | Phase 2 | Fixed (Phase 2) |
| SEC-06 | HIGH | Email confirmation bypassed at signup (`email_confirm: true`) | `frontend/src/app/api/auth/signup/route.ts:74–78` | Phase 2 | Fixed (Phase 2) |
| SEC-07 | HIGH | File upload MIME type trusts user-controlled `file.type` | `frontend/src/app/api/upload/route.ts:53–55` | Phase 1 | Fixed (Phase 1) |
| SEC-08 | HIGH | Dashboard analytics and stats endpoints unauthenticated | `frontend/src/app/api/dashboard/stats/route.ts` (entire), `frontend/src/app/api/dashboard/analytics/route.ts` (entire) | Phase 2 | Fixed (Phase 2) |
| SEC-09 | HIGH | Studio AI generation routes have no authentication | `frontend/src/app/api/studio/model-gen/route.ts`, `video-gen/route.ts`, `trends/route.ts`, `design/route.ts` | Phase 2 | Fixed (Phase 2) |
| SEC-10 | HIGH | IP rate limiting bypassable via `X-Forwarded-For` spoofing | `frontend/src/lib/ipRateLimit.ts:17–25`, `frontend/src/lib/rateLimit.ts:10–14` | Phase 3 | Fixed (Phase 3) |
| SEC-11 | HIGH | Clothing status endpoint has no authentication | `frontend/src/app/api/clothing/status/[taskId]/route.ts` (entire) | Phase 2 | Fixed (Phase 2) |
| SEC-12 | MEDIUM | Webhook endpoint indirectly open when `INTERNAL_SERVICE_TOKEN` unset | `frontend/src/app/api/webhook/avatar-ready/route.ts:7–10`, `backend/main.py:51–55` | Phase 3 | Fixed (Phase 3) |
| SEC-13 | MEDIUM | No request signing (HMAC) on webhook callbacks — replay attack vector | `frontend/src/app/api/webhook/avatar-ready/route.ts` | Phase 4 | Fixed (Phase 4) |
| SEC-14 | MEDIUM | No input sanitization or max-length on AI prompt fields | `frontend/src/app/api/studio/trends/route.ts:107–110` | Phase 2 | Fixed (Phase 2) |
| SEC-15 | MEDIUM | `face_texture.py` uses `urllib.urlopen` with no URL validation or timeout | `backend/pipeline/face_texture.py:20–22` | Phase 5 | Fixed (Phase 5) |
| SEC-16 | MEDIUM | `video_processor.py` unbounded frame extraction — memory DoS | `backend/pipeline/video_processor.py:43–48` | Phase 5 | Fixed (Phase 5) |
| SEC-17 | LOW | Non-atomic rate limit increment — race condition allows over-limit requests | `frontend/src/lib/ipRateLimit.ts:94–113` | Phase 3 | Fixed (Phase 3) |
| SEC-18 | LOW | `ip_usage_limits` table grows unboundedly — no cleanup job | Supabase `ip_usage_limits` table | Phase 6 | Fixed (Phase 6) |
| SEC-19 | LOW | `bookings` route uses anon key — RLS misconfiguration silently drops inserts | `frontend/src/app/api/bookings/route.ts:6–7,10` | Phase 4 | Fixed (Phase 4) |
| SEC-20 | LOW | Hardcoded HuggingFace IDM-VTON URL — no env-var override | `backend/pipeline/video_processor.py:14` | Phase 5 | Fixed (Phase 5) |
| TD-01 | LOW | Duplicate rate-limit implementations — maintenance confusion | `frontend/src/lib/ipRateLimit.ts`, `frontend/src/lib/rateLimit.ts` | Phase 3 | Fixed (Phase 3) |
| TD-02 | LOW | Hardcoded fit metadata returned without calculation | `frontend/src/app/api/tryon/route.ts:263–271` | Deferred | Deferred |
| TD-03 | LOW | `as any` casts bypass Supabase type safety | `frontend/src/app/api/tryon/route.ts:46,256`, `studio/design/route.ts:184`, `clothing/route.ts:157,165`, `upload/route.ts:36` | Deferred | Deferred |
| TD-04 | LOW | `ignoreBuildErrors` and `ignoreDuringBuilds` in next.config.mjs | `frontend/next.config.mjs:11,15` | Deferred | Deferred |
| TD-05 | LOW | `process-video` route missing from Python backend — video pipeline non-functional | `frontend/src/app/api/tryon/video/route.ts:104–114`, `backend/main.py` (no route) | Deferred | Deferred |
| TD-06 | LOW | Heatmap generation stubbed with `null` | `frontend/src/app/api/tryon/[productId]/route.ts:74–75` | Deferred | Deferred |
| TD-07 | LOW | All API routes untested — auth bypass regressions can ship undetected | `frontend/src/app/api/` (29 files) | Deferred | Deferred |
| TD-08 | LOW | No structured logging or request correlation IDs | All `frontend/src/app/api/` routes | Deferred | Deferred |
| TD-09 | LOW | `Supabase.auth.admin.createUser` without email verification (fixed) → email format validation needed | `frontend/src/app/api/auth/signup/route.ts` | Phase 2 | Fixed (Phase 2) |
| PERF-01 | LOW | Batch try-on processes products serially (5–15s per product) | `frontend/src/app/api/tryon/batch/route.ts:55–98` | Deferred | Deferred |
| PERF-02 | LOW | Supabase client instantiated on every request — no singleton | All 20+ routes in `frontend/src/app/api/` | Deferred | Deferred |

---

## Remaining Risks / Deferred Items

### Functional / Tech Debt (Non-Security)

**TD-02 — Hardcoded Fit Metadata**
- The try-on response always returns `fitLabel: 'True to size'`, `recommendedSize: 'M'`, `fitScore: 85`.
- The fit engine (`fitEngine.ts`) exists but is not called from the hot path.
- This is a functional correctness issue — no security risk, but misleads users.
- Owner: Product team. Target: Milestone 2 (fit engine integration).

**TD-03 — TypeScript `as any` Casts**
- Multiple Supabase upsert calls bypass the generated `Database` type.
- Fix: Run `npx supabase gen types typescript` after schema stabilizes, remove all casts.
- Owner: Engineering. Target: Next sprint after schema freeze.

**TD-04 — Build Errors Suppressed**
- `next.config.mjs` suppresses TypeScript errors and ESLint during production builds.
- Risk: Regressions that would be caught at build time can ship silently.
- Fix: Remove `ignoreBuildErrors: true` and `ignoreDuringBuilds: true`. Address underlying type errors.
- Owner: Engineering. Target: Before first public beta launch.

**TD-05 — Missing `/process-video` Endpoint**
- Video try-on is non-functional end-to-end; job dispatch silently fails.
- Owner: Backend team. Target: Video try-on milestone.

**TD-06 — Heatmap Stub**
- `heatmapUrl: null` is always returned.
- Owner: ML team. Target: Inference service v2.

**TD-07 — API Routes Untested**
- No unit or integration tests for any of the 29 API routes.
- Auth bypass regressions (e.g., demo bypass recurrence) would not be caught before deploy.
- Owner: Engineering. Target: CI gate implementation (Phase 7 partial, ongoing).

**TD-08 — No Structured Logging**
- `console.log/error` used throughout; no correlation IDs.
- Owner: Platform team. Target: Observability milestone.

### Performance / Scaling

**PERF-01 — Serial Batch Try-On**
- At 5–15 seconds per product, a 10-product batch takes 50–150 seconds.
- Fix: `Promise.all` with `p-limit(3)` concurrency cap.

**PERF-02 — Supabase Client Per Request**
- Redundant object allocation on every hot-path request.
- Fix: Export a `getServiceSupabase()` singleton from `frontend/src/lib/supabase.ts`.

---

## Security Recommendations for Future Milestones

1. **Add SAST to CI pipeline** — Run `eslint-plugin-security` and `semgrep` on every PR.
   Blocks: Any auth regression from re-entering the codebase undetected.

2. **Enable Supabase Row Level Security audit** — Verify RLS policies on `users`, `tryon_results`,
   `api_keys`, and `bookings` tables are correct and restrictive by default.
   Blocks: IDOR vulnerabilities at the DB layer.

3. **Add end-to-end tests for auth flows** — Playwright test: unauthenticated request to
   `/api/dashboard/stats` must return 401; try-on with spoofed `userId` must be rejected.
   Blocks: Regression testing gate.

4. **Add secret rotation procedure** — Document how to rotate `TNB_API_KEY`, `OPENAI_API_KEY`,
   `INTERNAL_SERVICE_TOKEN`, and `VEXA_ADMIN_KEY` without downtime.
   See: `docs/ROLLBACK.md` for deployment procedures.

5. **Enable Cloudflare WAF rules** — Block requests with `X-Forwarded-For` manipulation to
   complement the application-level fix (SEC-10).

6. **Implement audit logging for admin actions** — The `admin_logs` table exists; ensure every
   key generation, revocation, and dashboard action writes a row with `user_id`, `action`, and `ip`.

7. **Add Content-Security-Policy header** — Currently no CSP is set in Next.js headers config.
   This mitigates XSS impact on the client-side avatar viewer and embed widget.

8. **Rate limit the auth endpoints** — `/api/auth/signup` and `/api/auth/login` have no rate
   limits. Add brute-force protection (e.g., 5 attempts per IP per 15 minutes).

---

*Security audit: 2026-05-13 | Phase 8 documentation pass*
