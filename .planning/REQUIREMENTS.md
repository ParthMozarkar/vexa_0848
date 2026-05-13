# VEXA AI Infrastructure Scale — Requirements

**Milestone:** v2.0 AI Infrastructure Scale
**Status:** Active

---

## v2.0 Requirements

### Provider Abstraction (Task 1)

- [ ] **PROV-01**: `frontend/src/lib/providers/` module exists with a common `AIProvider` interface (call, health check, name, capabilities)
- [ ] **PROV-02**: TNB provider adapter implements the interface — wraps existing callTNB logic without changing output format
- [ ] **PROV-03**: OpenAI provider adapter implements the interface — wraps existing DALL-E/GPT calls without changing output format
- [ ] **PROV-04**: Meshy provider adapter implements the interface — wraps existing 3D model generation calls
- [ ] **PROV-05**: BlackBox provider adapter implements the interface — wraps existing BlackBox calls
- [ ] **PROV-06**: Provider registry maps capability names (tryon, design, model-gen, video) to ordered provider list (primary + fallback)
- [ ] **PROV-07**: No change to provider output formats or API response shapes (zero regression)

### Job Queue System (Task 2)

- [ ] **JOB-01**: Redis connection utility created (`frontend/src/lib/redis.ts`) — connects via `REDIS_URL` env var, gracefully degrades if Redis unavailable
- [ ] **JOB-02**: BullMQ job queue definitions created for: `tryon-video`, `avatar-heavy`, `meshy-gen`
- [ ] **JOB-03**: `/api/tryon/video` converted to enqueue-and-return-jobId pattern — returns `{ jobId, status: "queued" }` instead of blocking
- [ ] **JOB-04**: `/api/studio/model-gen` (Meshy) converted to enqueue-and-return-jobId pattern
- [ ] **JOB-05**: `/api/avatar/generate` heavy path (SMPL-X) converted to enqueue-and-return-jobId pattern
- [ ] **JOB-06**: Status polling endpoint `GET /api/jobs/[jobId]` returns `{ status, result?, error?, progress? }`
- [ ] **JOB-07**: BullMQ worker processes each queue with concurrency controls (max concurrent per queue configurable via env)
- [ ] **JOB-08**: Existing synchronous try-on (`/api/tryon`) preserved unchanged — only heavy/long-running operations queued

### Retries + Failover (Task 3)

- [ ] **RETRY-01**: Exponential backoff utility (`frontend/src/lib/retry.ts`) — configurable base delay, max attempts, jitter
- [ ] **RETRY-02**: TNB calls use retry with backoff (3 attempts, 1s/2s/4s base, replace existing ad-hoc hedging where appropriate)
- [ ] **RETRY-03**: OpenAI calls use retry with backoff (3 attempts, rate-limit-aware)
- [ ] **RETRY-04**: Provider failover: if primary provider exhausts retries, registry tries next provider in capability list
- [ ] **RETRY-05**: Timeout per provider call enforced (provider-specific, configured in registry)
- [ ] **RETRY-06**: Graceful degradation: on total provider failure, return structured error `{ error, retryAfter, fallbackAvailable }` — never silent hang

### Caching (Task 4)

- [ ] **CACHE-01**: Cache utility (`frontend/src/lib/cache.ts`) — Redis-backed with in-memory fallback (LRU), TTL-configurable
- [ ] **CACHE-02**: Image resolution cache — resolved public URLs cached by source URL (avoids repeated R2 uploads of same image)
- [ ] **CACHE-03**: Generation result cache — try-on results keyed by `hash(personUrl + garmentUrl + category)`, TTL 24h
- [ ] **CACHE-04**: Provider response cache — identical AI requests (same inputs) return cached response, skip provider call
- [ ] **CACHE-05**: Upload deduplication — same file bytes (content hash) skip re-upload, return existing R2 URL
- [ ] **CACHE-06**: Cache bypass header `x-cache-bypass: true` for forced refresh (admin/debug use only)

### Cost Protection (Task 5)

- [ ] **COST-01**: Provider usage tracker (`frontend/src/lib/costTracker.ts`) — records per-call: provider, endpoint, userId, timestamp, estimated cost
- [ ] **COST-02**: Per-user daily AI call budget enforced (configurable via env `MAX_AI_CALLS_PER_USER_DAY`, default 20)
- [ ] **COST-03**: Hedging controls: max concurrent hedged requests capped (env `MAX_HEDGE_CONCURRENCY`, default 2)
- [ ] **COST-04**: Duplicate request detection — identical request fingerprint within 5s from same user returns in-flight result (not new AI call)
- [ ] **COST-05**: Cost estimation logged per provider call (TNB: $0.05/call, OpenAI image: $0.04/call, configurable)
- [ ] **COST-06**: Abuse prevention: burst limiter per userId (max 5 AI calls per 10 seconds)

### AI Infra Documentation (Task 6)

- [ ] **AIDOC-01**: `docs/AI-INFRA-ARCH.md` — component diagram, queue topology, provider map, data flows
- [ ] **AIDOC-02**: `docs/PROVIDER-MAP.md` — provider capabilities, fallback chains, cost estimates, config keys
- [ ] **AIDOC-03**: `docs/RETRY-STRATEGY.md` — retry policy per provider, backoff parameters, failover logic
- [ ] **AIDOC-04**: `docs/SCALING-RECOMMENDATIONS.md` — Redis sizing, worker concurrency, queue depth targets, cost projections

---

## Future Requirements (Deferred)

- Full BullMQ dashboard UI (Bull Board)
- Cross-provider quality comparison A/B testing
- Automatic provider cost optimization (cheapest provider first)
- Provider SLA monitoring with alerting
- Dead letter queue processing UI

---

## Out of Scope

- Changing any user-facing API response shapes — zero regression rule
- Migrating synchronous try-on to async — main `/api/tryon` stays synchronous
- Self-hosted AI model inference — external providers only
- Provider billing integration — estimation only, not real billing data

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| PROV-01 | Phase 9: Provider Abstraction Layer | Pending |
| PROV-02 | Phase 9: Provider Abstraction Layer | Pending |
| PROV-03 | Phase 9: Provider Abstraction Layer | Pending |
| PROV-04 | Phase 9: Provider Abstraction Layer | Pending |
| PROV-05 | Phase 9: Provider Abstraction Layer | Pending |
| PROV-06 | Phase 9: Provider Abstraction Layer | Pending |
| PROV-07 | Phase 9: Provider Abstraction Layer | Pending |
| JOB-01 | Phase 10: Job Queue System | Pending |
| JOB-02 | Phase 10: Job Queue System | Pending |
| JOB-03 | Phase 10: Job Queue System | Pending |
| JOB-04 | Phase 10: Job Queue System | Pending |
| JOB-05 | Phase 10: Job Queue System | Pending |
| JOB-06 | Phase 10: Job Queue System | Pending |
| JOB-07 | Phase 10: Job Queue System | Pending |
| JOB-08 | Phase 10: Job Queue System | Pending |
| RETRY-01 | Phase 11: Retries + Failover | Pending |
| RETRY-02 | Phase 11: Retries + Failover | Pending |
| RETRY-03 | Phase 11: Retries + Failover | Pending |
| RETRY-04 | Phase 11: Retries + Failover | Pending |
| RETRY-05 | Phase 11: Retries + Failover | Pending |
| RETRY-06 | Phase 11: Retries + Failover | Pending |
| CACHE-01 | Phase 12: Caching | Pending |
| CACHE-02 | Phase 12: Caching | Pending |
| CACHE-03 | Phase 12: Caching | Pending |
| CACHE-04 | Phase 12: Caching | Pending |
| CACHE-05 | Phase 12: Caching | Pending |
| CACHE-06 | Phase 12: Caching | Pending |
| COST-01 | Phase 13: Cost Protection | Pending |
| COST-02 | Phase 13: Cost Protection | Pending |
| COST-03 | Phase 13: Cost Protection | Pending |
| COST-04 | Phase 13: Cost Protection | Pending |
| COST-05 | Phase 13: Cost Protection | Pending |
| COST-06 | Phase 13: Cost Protection | Pending |
| AIDOC-01 | Phase 14: AI Infra Documentation | Pending |
| AIDOC-02 | Phase 14: AI Infra Documentation | Pending |
| AIDOC-03 | Phase 14: AI Infra Documentation | Pending |
| AIDOC-04 | Phase 14: AI Infra Documentation | Pending |
