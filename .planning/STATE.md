---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: AI Infrastructure Scale
status: planning
last_updated: "2026-05-14T00:00:00.000Z"
last_activity: 2026-05-14
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# VEXA AI Infrastructure Scale — Project State

**Last updated:** 2026-05-14
**Milestone:** v2.0 AI Infrastructure Scale

---

## Project Reference

**Core Value:** Scalable AI pipelines that preserve existing user-facing behavior while eliminating duplicate costs, single-provider lock-in, and synchronous blocking on heavy AI workloads.

**Current Focus:** Phase 9 — Provider Abstraction Layer (or Phase 10 — Job Queue System; these two can run in parallel)

---

## Current Position

```
Phase: Not started
Plan: —
Status: Roadmap defined, ready for planning
Last activity: 2026-05-14 — v2.0 roadmap created

Progress: [░░░░░░░░░░░░░░░░░░░░] 0% (0/6 phases)
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Requirements total | 37 |
| Requirements complete | 0 |
| Phases complete | 0/6 |
| Plans complete | 0 |
| Blockers | None |

---

## Accumulated Context

### Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| Provider abstraction in frontend/src/lib/providers/ | Collocated with existing lib utilities; no new packages needed |
| Redis + BullMQ for job queues | BullMQ is the de-facto BullMQ successor with TypeScript-first API |
| Main /api/tryon stays synchronous | Zero regression rule — changing response shape breaks B2B clients |
| Only video, avatar heavy path, and Meshy get queued | These are the only routes that block >10s; image try-on is fast enough |
| Cache keyed by hash(personUrl + garmentUrl + category) | Deterministic deduplication without storing raw URLs in cache keys |
| Cost tracking in costTracker.ts, not middleware | Middleware runs on every request; AI costs only apply to provider calls |
| Redis-backed cache with in-memory LRU fallback | Resilience when Redis is unavailable; no hard dependency on external state |
| Retry utility separate from provider adapters | Reusable across providers without coupling retry policy to adapter code |

### Critical Files to Know

| File | Why It Matters |
|------|----------------|
| frontend/src/app/api/tryon/route.ts | Stays synchronous — zero change to response shape |
| frontend/src/app/api/tryon/video/route.ts | Convert to enqueue-and-return-jobId (JOB-03) |
| frontend/src/app/api/studio/model-gen/route.ts | Convert to enqueue-and-return-jobId (JOB-04) |
| frontend/src/app/api/avatar/generate/route.ts | Heavy SMPL-X path converts to async (JOB-05) |
| frontend/src/lib/ | New modules land here: providers/, redis.ts, retry.ts, cache.ts, costTracker.ts |

### Zero Regression Constraints

- /api/tryon response shape must not change — B2B clients depend on it
- All provider output formats preserved — adapters wrap, never transform
- Existing synchronous flows remain synchronous unless explicitly listed for async conversion
- No new required environment variables without a sensible default or graceful degradation path

### Todos

- [ ] Begin Phase 9: Create frontend/src/lib/providers/ with AIProvider interface and four adapters
- [ ] Begin Phase 10 (parallel): Create frontend/src/lib/redis.ts and BullMQ queue definitions
- [ ] Audit existing TNB, OpenAI, Meshy, BlackBox call sites before writing adapters — ensure output shapes are captured

### Blockers

None currently.

---

## Session Continuity

**To resume this project:**

1. Read this STATE.md for current position
2. Read ROADMAP.md (v2.0 section) for phase goals and success criteria
3. Read REQUIREMENTS.md for full requirement specifications
4. Phases 9 and 10 can start in parallel — both have no dependencies
5. Start with Phase 9 (provider abstraction) OR Phase 10 (job queues)

**Next action:** `/gsd-plan-phase 9`

---

*State initialized for v2.0: 2026-05-14*
