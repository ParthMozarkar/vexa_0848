# VEXA Scaling Recommendations

## Redis Sizing

| Daily Requests | Est. Redis Memory | Recommendation |
|---------------|------------------|---------------|
| < 1,000 | 256MB | Upstash free tier; single instance |
| 1,000–10,000 | 512MB–1GB | Upstash Pay-as-you-go or Redis Cloud Essentials |
| 10,000–100,000 | 2–4GB | Dedicated Redis instance (Railway, Render, or self-hosted) |
| > 100,000 | 8–16GB+ | Redis Cluster with read replicas |

**Cache TTLs drive memory usage.** Generation result cache (24h TTL, ~2KB/entry) at 10k req/day = ~20MB/day churn. Upload dedup cache (7-day TTL) is the largest consumer at scale.

---

## Worker Concurrency

| Queue | Dev | Staging | Prod (< 1k/day) | Prod (> 10k/day) |
|-------|-----|---------|----------------|-----------------|
| `tryon-video` | 1 | 2 | 3 | 10–20 |
| `avatar-heavy` | 1 | 1 | 2 | 5 |
| `meshy-gen` | 1 | 2 | 5 | 20 |

Configure via environment variables on the worker process:
```
WORKER_CONCURRENCY_VIDEO=3
WORKER_CONCURRENCY_AVATAR=2
WORKER_CONCURRENCY_MESHY=5
```

**Bottleneck:** `avatar-heavy` is CPU/GPU-bound on the Python backend. Scale the Python service horizontally before increasing avatar worker concurrency.

---

## Queue Depth Thresholds

Alert if queue depth exceeds these values for more than 5 minutes:

| Queue | Warning | Critical |
|-------|---------|---------|
| `tryon-video` | 50 jobs | 200 jobs |
| `avatar-heavy` | 10 jobs | 50 jobs |
| `meshy-gen` | 100 jobs | 500 jobs |

Monitor with: `queue.getWaitingCount()` + `queue.getActiveCount()` via BullMQ API.

---

## Monthly Cost Projections

Estimates based on default provider costs ($0.05 TNB, $0.04 OpenAI image, $0.02 BlackBox). Assumes 70% try-on, 20% design, 10% model-gen split.

| Daily Requests | TNB (try-on) | OpenAI (design) | BlackBox (model) | Redis | Total Est./mo |
|---------------|-------------|----------------|-----------------|-------|--------------|
| 1,000 | $10.50 | $2.40 | $0.60 | $0 (free) | **~$14** |
| 10,000 | $105 | $24 | $6 | $10 | **~$145** |
| 100,000 | $1,050 | $240 | $60 | $50 | **~$1,400** |

**Cache impact:** At 60% cache hit rate on try-on, TNB costs reduce by ~60%. At 100k req/day with 60% hits, TNB cost drops from $1,050 → ~$420/mo.

---

## Rate Limit Tuning

| Variable | Default | Increase if | Decrease if |
|----------|---------|------------|------------|
| `MAX_AI_CALLS_PER_USER_DAY` | 20 | Paid users, B2B clients | Abuse detected |
| `MAX_HEDGE_CONCURRENCY` | 2 | P99 latency too high | Provider rate limits hit |
| `TNB_TIMEOUT_MS` | 120000 | Video jobs timing out | Cost too high per failed call |

---

## Horizontal Scaling Notes

- **Next.js API routes:** Stateless. Scale horizontally freely. `aiRateLimit.ts` and `requestDedup.ts` use in-memory store — migrate to Redis-backed counters for multi-instance deployments.
- **BullMQ workers:** Run as separate Node.js processes. Multiple worker instances for the same queue share work automatically (BullMQ distributes jobs).
- **Python backend:** Scale horizontally with a load balancer. Avatar jobs are the bottleneck — add GPU instances for `avatar-heavy` queue.
- **Redis:** Single point of contention at scale — use Redis Cluster or read replicas for cache reads.

---

*Scaling recommendations: 2026-05-14 — v2.0*
