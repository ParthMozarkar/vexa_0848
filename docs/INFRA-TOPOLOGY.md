# VEXA Infrastructure Topology

**Document Date:** 2026-05-14
**Version:** 1.0
**Audience:** Engineers, DevOps, security reviewers, enterprise architecture reviews

---

## Full Topology Diagram

```
Internet
  |
  v  Cloudflare CDN (static assets, GLB files, result images)
  |
  v  Vercel Edge Network
  |   +-- Next.js App (API Routes + SSR)
  |         |
  |         +-- /api/tryon ──────────────────────────────────────> TNB AI API
  |         |      (sync; 120s timeout; cache lookup first)         thenewblack.ai
  |         |
  |         +-- /api/studio/design ──────────────────────────────> OpenAI API
  |         |      (sync; DALL-E 3 images + GPT-4o-mini text)       api.openai.com
  |         |
  |         +-- /api/tryon/video ──> BullMQ Queue ──> Workers ──> TNB Video API
  |         |      (async; returns jobId < 500ms)      tryon-video    vto_video endpoint
  |         |
  |         +-- /api/avatar/generate ─> BullMQ Queue ─> Workers ─> Python Backend
  |         |      (async; returns jobId < 500ms)        avatar-heavy   :8000/generate-avatar-full
  |         |
  |         +-- /api/studio/model-gen ─> BullMQ Queue ─> Workers ─> BlackBox API
  |         |      (async; returns jobId < 500ms)          meshy-gen     api.blackbox.ai
  |         |
  |         +-- /api/jobs/[id] ─────────────────────────────────> Redis (poll job state)
  |         |      (sync poll; returns job status + result)
  |         |
  |         +-- /api/upload ────────────────────────────────────> Cloudflare R2
  |         |      (sync; magic bytes validation; R2 primary,         (primary)
  |         |       Supabase Storage fallback)                  > Supabase Storage
  |         |                                                         (fallback)
  |         +-- /api/proxy ─────────────────────────────────────> External Image URLs
  |         |      (SSRF-guarded; private IPs blocked)               (public internet)
  |         |
  |         +-- /api/health ─> (inline check: Redis + Supabase)
  |         +-- /api/admin/* ─> (admin key required)
  |         +-- /api/keys/* ─> (API key management)
  |
  +-- Supabase (PostgreSQL + Auth + Storage)
  |     |
  |     +-- Auth: JWT issuance, email magic links, OAuth
  |     |
  |     +-- Core tables:
  |     |     users              (auth.uid() scoped via RLS)
  |     |     api_keys           (org_id scoped; key_hash only)
  |     |     tryon_results      (user_id scoped)
  |     |     video_jobs         (user_id scoped)
  |     |     avatars            (user_id scoped)
  |     |     design_history     (user_id scoped)
  |     |     bookings           (user_id scoped)
  |     |
  |     +-- Usage/billing tables:
  |     |     usage_logs         (marketplace_id scoped)
  |     |     usage_events       (org_id scoped; cost tracking)
  |     |     tenant_quotas      (org_id scoped; monthly caps)
  |     |     ip_usage_limits    (ip_address keyed; rate limits)
  |     |
  |     +-- Catalog tables:
  |     |     clothing_assets    (global; product catalog)
  |     |     admin_logs         (global; admin actions)
  |     |
  |     +-- Storage: fallback bucket for R2 uploads
  |
  +-- Cloudflare R2 (Object Storage)
  |     |
  |     +-- avatars/            (GLB files; long-lived; cache: 1 year)
  |     |     {userId}/avatar_{hash}.glb
  |     |
  |     +-- studio/tryons/      (result images; 90-day retention)
  |     |     {date}/{userId}/result_{hash}.jpg
  |     |
  |     +-- studio/uploads/     (user photos; 90-day retention)
  |           {date}/{userId}/upload_{hash}.jpg
  |
  +-- Redis (Upstash / Redis Cloud)
  |     |
  |     +-- BullMQ Queues:
  |     |     tryon-video        (concurrency: WORKER_CONCURRENCY_VIDEO)
  |     |     avatar-heavy       (concurrency: WORKER_CONCURRENCY_AVATAR)
  |     |     meshy-gen          (concurrency: WORKER_CONCURRENCY_MESHY)
  |     |
  |     +-- Cache (TTLs):
  |     |     gen:{hash}         generation results (24h)
  |     |     dedup:{hash}       request dedup (5s)
  |     |     resolved:{url}     image URL resolution (1h)
  |     |
  |     +-- Rate Limit Counters:
  |           ai_calls:{uid}:{date}    per-user AI call counter (24h)
  |           ip:{ip}:{endpoint}:{date} per-IP endpoint counter (24h)
  |
  +-- Python FastAPI Backend (Railway / Fly.io / GCP Cloud Run)
        |     INTERNAL_SERVICE_TOKEN required on all routes
        |
        +-- /health                 (public; no auth)
        +-- /generate-avatar        (lightweight; no SMPL-X)
        +-- /generate-avatar-full   (SMPL-X pipeline; GPU-preferred)
        |     |
        |     +-- pipeline/body_generator.py   (SMPL-X betas -> mesh)
        |     +-- pipeline/face_texture.py     (mediapipe face extract)
        |     +-- pipeline/r2_uploader.py      (boto3 -> R2)
        |
        +-- Writes to: Cloudflare R2 (GLB files)
        +-- Reads from: Supabase (user data via NEXT_PUBLIC_APP_URL)
```

---

## Network Boundaries and Auth Matrix

| Connection | Protocol | Authentication | Encryption |
|-----------|---------|---------------|-----------|
| Browser → Vercel | HTTPS | Supabase JWT or x-vexa-key | TLS 1.3 (Vercel-managed) |
| Vercel → TNB AI | HTTPS | `X-API-Key: TNB_API_KEY` | TLS 1.3 |
| Vercel → OpenAI | HTTPS | `Authorization: Bearer OPENAI_API_KEY` | TLS 1.3 |
| Vercel → BlackBox | HTTPS | `Authorization: Bearer BLACKBOX_API_KEY` | TLS 1.3 |
| Vercel → Python | HTTPS | `Authorization: Bearer INTERNAL_SERVICE_TOKEN` | TLS 1.3 (Railway/Fly.io TLS) |
| Vercel → Supabase | HTTPS | `supabase-service-key` (server-side only) | TLS 1.3 |
| Vercel → Redis | TLS | Password auth (`REDIS_URL` includes creds) | TLS (Upstash enforced) |
| Vercel → R2 | HTTPS | AWS SigV4 (Access Key + Secret) | TLS 1.3 |
| Python → R2 | HTTPS | AWS SigV4 (boto3) | TLS 1.3 |
| Vercel → External Image URLs (proxy) | HTTPS | None (public URLs) | TLS 1.3; SSRF guard |

---

## Port Map

| Service | Port | Exposure | Notes |
|---------|------|---------|-------|
| Next.js dev server | 4028 | Local only | `next dev -p 4028` |
| Python FastAPI | 8000 | Internal only | Never public-facing in prod |
| Redis | 6379 (TLS) | Internal only | Via `REDIS_URL`; never exposed to public |
| Supabase | 5432 (DB) | Supabase-managed | Via HTTPS API only; direct Postgres only for migrations |
| Vercel | 443 | Public | HTTPS; managed by Vercel Edge |

---

## Data Flow: Critical Path (Synchronous Image Try-On)

```
Browser
  |  POST /api/tryon + x-vexa-key header
  v
Vercel Edge (middleware.ts)
  |  1. Validate x-vexa-key -> SHA-256 hash lookup in Supabase api_keys
  |  2. Increment call_count; check monthly_limit
  |  3. Set x-marketplace-ctx header
  v
/api/tryon route handler
  |  4. IP rate limit check (ip_usage_limits table)
  |  5. User AI budget check (Redis counter)
  |  6. Request dedup check (Redis: dedup:{hash}, 5s TTL)
  |  7. Generation cache lookup (Redis: gen:{hash}, 24h TTL)
  |     |--- HIT: return cached resultUrl in < 100ms (END)
  |     v--- MISS: continue
  |  8. Resolve garment/person image URLs to public URLs
  |  9. callWithFailover('tryon', input) -> TNBProvider.call()
  |     |  withRetry (3 attempts, 1s/2s/4s backoff)
  |     |  fetch thenewblack.ai with X-API-Key
  |     |  parse response -> resultImageUrl
  |  10. persistResultImage -> R2 (primary) / Supabase Storage (fallback)
  |  11. Set generation cache (Redis: gen:{hash}, 24h TTL)
  |  12. trackProviderCall (usage_events insert)
  |  13. incrementAIUsage (Redis counter)
  |  14. Insert tryon_results row (Supabase)
  v
Browser receives: { resultUrl, fitLabel, recommendedSize, fitScore, generationsRemaining }
  |  Total time: 5–25s (miss) / < 100ms (hit)
```

---

## Async Job Flow: Video Try-On

```
Browser
  |  POST /api/tryon/video + Authorization: Bearer JWT
  v
/api/tryon/video route handler
  |  1. Auth check (Supabase JWT)
  |  2. Validate request body
  |  3. enqueueJob('tryon-video', { userId, videoUrl, productImageUrl, productId })
  |     -> Returns jobId in < 500ms
  v
Browser receives: { jobId, status: "queued" }

[Background: BullMQ Worker]
  |  aiWorker.ts dequeues job
  |  1. fetch TNB vto_video API (X-API-Key, 300s timeout)
  |  2. Persist result to R2
  |  3. job.returnvalue = { resultUrl, userId, productId, status: "ready" }

Browser polls:
  GET /api/jobs/{jobId} (every 3s until status: "completed")
  |  Returns: { status: "waiting" | "active" | "completed" | "failed",
  |             result: { resultUrl, ... } }
```

---

## Failure Mode Map

| Component Failure | Detected By | Auto-Recovery | Manual Action Required |
|------------------|------------|--------------|----------------------|
| Redis unavailable | `api/health` redis:false | In-memory LRU cache; DB-backed rate limits | Restart Redis; see Runbook 2 |
| R2 unavailable | Upload 500 errors | Automatic fallback to Supabase Storage | Verify R2 credentials; see Runbook 4 |
| TNB API unavailable | Sentry AIError spike | No auto-recovery (no fallback configured) | Register fallback; see Runbook 1 |
| Python service unavailable | `/api/avatar/generate` 502 | Returns placeholder GLB | Restart Python service |
| Supabase unavailable | All APIs 500 | No auto-recovery | PITR restore; see Runbook 3 |
| Vercel deployment failure | Build log | No auto-recovery | Rollback via Vercel dashboard |
| Worker process crash | Jobs stuck in "active" state | BullMQ re-queues after lock expiry (30s) | Restart worker process |

---

*Infrastructure topology: 2026-05-14 — VEXA v4.0*
