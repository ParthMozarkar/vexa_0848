# VEXA AI Infrastructure Architecture

## System Overview

```
Browser / B2B Client
        │
        ▼ HTTPS
┌─────────────────────────────────────────────────┐
│           Next.js API Routes (Vercel)            │
│                                                  │
│  /api/tryon ──────────────── synchronous ──────► TNBProvider.call()
│  /api/tryon/video ─────────► enqueue ──────────► Redis Queue: tryon-video
│  /api/avatar/generate ─────► enqueue ──────────► Redis Queue: avatar-heavy
│  /api/studio/model-gen ────► enqueue ──────────► Redis Queue: meshy-gen
│  /api/jobs/[jobId] ────────► poll status        │
│  /api/studio/design ───────────────────────────► OpenAIProvider.call()
│                                                  │
│  Cache Layer (cache.ts)                          │
│    Redis ──► in-memory LRU fallback              │
│    Keyed by: content hash, input hash, URL       │
│                                                  │
│  Cost Protection                                 │
│    aiRateLimit.ts: daily budget + burst cap      │
│    requestDedup.ts: 5s dedup window              │
│    costTracker.ts: per-call cost logging         │
└─────────────────────────────────────────────────┘
        │                           │
        ▼                           ▼
┌──────────────┐          ┌─────────────────────┐
│    Redis     │          │  Provider Registry   │
│              │          │  (registry.ts)       │
│  3 Queues:   │          │                      │
│  tryon-video │          │  tryon → TNB         │
│  avatar-heavy│          │  design → OpenAI     │
│  meshy-gen   │          │  model-gen → BlackBox│
└──────┬───────┘          └─────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│           BullMQ Workers (aiWorker.ts)        │
│                                              │
│  tryon-video worker ──────────────────────► TNB vto_video API
│  avatar-heavy worker ─────────────────────► Python FastAPI /generate-avatar-full
│  meshy-gen worker ────────────────────────► BlackBox model-gen API
│                                              │
│  Concurrency:                                │
│    tryon-video: WORKER_CONCURRENCY_VIDEO     │
│    avatar-heavy: WORKER_CONCURRENCY_AVATAR   │
│    meshy-gen: WORKER_CONCURRENCY_MESHY       │
└──────────────────────────────────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
  TNB AI API         Python Backend       BlackBox API
  (video try-on)     (FastAPI :8000)      (model-gen)
                           │
                    Cloudflare R2
                    (asset storage)
```

---

## Queue Topology

| Queue | Job Data | Default Concurrency | Timeout | Retry Policy |
|-------|----------|--------------------|---------| -------------|
| `tryon-video` | userId, videoUrl, productImageUrl, productId | 2 (`WORKER_CONCURRENCY_VIDEO`) | 300s | 3 attempts, exponential backoff 1s base |
| `avatar-heavy` | userId, photoUrl, measurements | 1 (`WORKER_CONCURRENCY_AVATAR`) | 300s | 3 attempts, exponential backoff 1s base |
| `meshy-gen` | garmentImageUrl, modelGender, userId | 3 (`WORKER_CONCURRENCY_MESHY`) | 120s | 3 attempts, exponential backoff 1s base |

**Job lifecycle:** `waiting` → `active` → `completed` / `failed`
**Retention:** completed jobs removed after 24h; failed jobs retained 7 days for inspection.

---

## Data Flow Walkthroughs

### A. Synchronous Image Try-On (no queue)

```
POST /api/tryon
  → auth check (x-vexa-key or Bearer)
  → IP rate limit check
  → user daily AI budget check (aiRateLimit.ts)
  → request dedup check (5s window)
  → generation cache lookup (cache.ts, key: hash(person+garment+category))
      ├─ HIT: return cached resultUrl (< 100ms)
      └─ MISS: callWithFailover('tryon', ...) → TNBProvider.call()
                 → withRetry (3 attempts, 1s/2s/4s backoff)
                 → fetch thenewblack.ai with X-API-Key header
                 → parse response
                 → persistResultImage to R2
                 → set generation cache (TTL 24h)
                 → trackProviderCall (cost log)
                 → incrementAIUsage (daily counter)
  → return { resultUrl, status, fitLabel, ... }
```

### B. Async Video Try-On (queue + poll)

```
POST /api/tryon/video
  → validate body
  → auth check (Bearer)
  → enqueueJob('tryon-video', jobData)  ← returns { jobId } in < 500ms
  → return { jobId, status: 'queued' }

[Worker: aiWorker.ts]
  → dequeue job
  → fetch TNB vto_video API (X-API-Key header, 300s timeout)
  → job.returnvalue = { resultUrl, userId, productId, status: 'ready' }

GET /api/jobs/[jobId]
  → queue.getJob(jobId) → { status: 'completed', result: { resultUrl, ... } }
```

### C. Cache Hit Flow

```
POST /api/tryon  (same person + garment + category as prior call within 24h)
  → generation cache lookup
  → HIT: return { resultUrl: cachedUrl, status: 'ready' }
  [No TNB call made. Response time < 100ms]
```

---

## Security Boundaries

| Boundary | Protection |
|----------|-----------|
| Next.js → Python backend | `INTERNAL_SERVICE_TOKEN` Bearer header |
| B2B clients → Next.js | `x-vexa-key` header, SHA-256 hashed in DB |
| Provider API keys | Headers only (`X-API-Key`, `Authorization`) — never in URLs |
| Redis | `REDIS_URL` env var; no public exposure |
| Worker process | Reads env vars directly; no HTTP exposure |

---

## Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `REDIS_URL` | redis.ts, queues.ts, cache.ts | Redis connection string |
| `WORKER_CONCURRENCY_VIDEO` | aiWorker.ts | Max parallel video jobs |
| `WORKER_CONCURRENCY_AVATAR` | aiWorker.ts | Max parallel avatar jobs |
| `WORKER_CONCURRENCY_MESHY` | aiWorker.ts | Max parallel meshy jobs |
| `MAX_AI_CALLS_PER_USER_DAY` | aiRateLimit.ts | Daily AI call cap per user |
| `MAX_HEDGE_CONCURRENCY` | hedgingControls.ts | Max simultaneous hedged requests |
| `TNB_TIMEOUT_MS` | providerTimeouts.ts | TNB call timeout |
| `OPENAI_TIMEOUT_MS` | providerTimeouts.ts | OpenAI call timeout |
| `BLACKBOX_TIMEOUT_MS` | providerTimeouts.ts | BlackBox call timeout |
| `COST_TNB_PER_CALL` | costTracker.ts | Estimated USD cost per TNB call |
| `COST_OPENAI_IMAGE_PER_CALL` | costTracker.ts | Estimated USD cost per DALL-E call |

---

*Generated: 2026-05-14 — v2.0 AI Infrastructure Scale*
