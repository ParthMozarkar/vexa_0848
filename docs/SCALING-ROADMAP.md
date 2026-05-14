# VEXA Scaling Roadmap: To 1M Requests/Day

**Document Date:** 2026-05-14
**Version:** 1.0
**Audience:** Engineering leadership, infrastructure team, CTO

---

## Overview

This document describes the phased infrastructure changes required to scale VEXA from its
current capacity (< 1k req/day) to 1 million requests per day. Each tier has specific
trigger conditions — do not over-invest in scaling work before traffic demands it.

**Key insight:** The costliest bottleneck at each tier is the AI provider latency and cost,
not the application infrastructure. Caching, deduplication, and queue management must be
optimised before throwing hardware at the problem.

---

## Traffic Tier Summary

| Tier | Traffic Range | Monthly Cost Estimate | Key Infrastructure Change |
|------|--------------|----------------------|--------------------------|
| Current | < 1k req/day | < $100/month | Single Vercel deployment |
| Tier 1 | 1k–10k req/day | $300–$1,500/month | Redis upgrade, worker scaling |
| Tier 2 | 10k–100k req/day | $2,000–$15,000/month | Auto-scaling workers, CDN, read replicas |
| Tier 3 | 100k–1M req/day | $20,000–$150,000/month | Multi-region, dedicated GPU fleet, analytics DB |

Cost estimates assume 60% cache hit rate for try-on requests. Actual costs vary
significantly with cache performance and provider pricing.

---

## Current State (< 1k req/day)

**When:** Early product, pilot customers, proof-of-concept phase.

### Infrastructure

| Component | Configuration | Limitation |
|-----------|--------------|-----------|
| Next.js app | Single Vercel deployment (Hobby/Pro) | 10–120s function timeout; cold starts on free tier |
| Redis | Upstash free tier (10k requests/day) | Single region, 256MB memory limit |
| Avatar worker | 1 process, `WORKER_CONCURRENCY_AVATAR=1` | Single job at a time |
| Video worker | 1 process, `WORKER_CONCURRENCY_VIDEO=2` | 2 concurrent video jobs |
| Meshy worker | 1 process, `WORKER_CONCURRENCY_MESHY=3` | 3 concurrent model-gen jobs |
| Rate limiting | In-memory LRU fallback when Redis limit exceeded | Counters reset on process restart |
| Caching | Redis cache with in-memory LRU fallback | Cache not shared across function invocations if no Redis |
| Storage | Cloudflare R2 (primary) + Supabase Storage (fallback) | Single region |
| Database | Supabase free tier | 500MB limit, pauses after 7 days inactivity |

### Optimisations at This Tier (do before scaling up)

1. **Measure cache hit rate:** If < 40%, investigate why repeat requests are missing cache
   (check key construction, TTL, Redis availability)
2. **Enable request deduplication:** `requestDedup.ts` should be active (5s window)
3. **Profile slow requests:** Identify the p95 tail; is it TNB, upload, or DB?
4. **Set up Sentry:** All errors should be captured with context before scaling

---

## Tier 1 (1k–10k req/day)

**Trigger:** Sustained > 1k req/day for 3+ consecutive days, OR Redis free tier hitting 80%
of 10k daily request limit, OR worker queue depth exceeding 20 jobs for > 5 minutes.

### Infrastructure Changes

| Component | Change | Rationale |
|-----------|--------|----------|
| Vercel | Upgrade to Vercel Pro ($20/month) | Removes 10s timeout limit; enables 120s for try-on routes; removes cold start penalty |
| Redis | Upgrade to Upstash Pay-as-you-go or Redis Cloud 1GB | Remove 10k/day request cap; enable persistence; 1GB for larger cache |
| Avatar workers | Scale to 2 workers, `WORKER_CONCURRENCY_AVATAR=2` | Reduce queue wait time for concurrent avatar requests |
| Video workers | Scale to 3–5 workers, `WORKER_CONCURRENCY_VIDEO=5` | Video jobs take 90s each; 5 concurrent needed for smooth throughput |
| Meshy workers | Scale to 2 workers, `WORKER_CONCURRENCY_MESHY=5` | Model gen is faster (120s); higher concurrency beneficial |
| Rate limiting | Switch `aiRateLimit.ts` to Redis-backed counters | Shared state across function invocations; accurate per-user limits |
| Caching | Enable generation result caching fully | Ensure `REDIS_URL` is set; target > 50% cache hit rate |
| Database | Upgrade Supabase to Pro ($25/month) | Remove 500MB limit, pause-on-inactivity, enable PITR backups |

### Monitoring to Add at Tier 1

- UptimeRobot or Better Uptime monitoring `/api/health` (60s interval, alert on 2 failures)
- Sentry alert: error rate > 5% on `/api/tryon`
- Redis memory usage alert at 70%
- Weekly cost review against budget forecast

### Code Changes Required

```typescript
// frontend/src/lib/aiRateLimit.ts
// Switch from in-memory counter to Redis counter for shared state:
// Before: Map<string, number> in module scope (resets on deploy)
// After: Redis INCR with EXPIRE (shared across all function invocations)

const key = `ai_calls:${userId}:${today}`;
const current = await redis.incr(key);
if (current === 1) await redis.expire(key, 86400); // 24h TTL
if (current > MAX_AI_CALLS_PER_USER_DAY) throw new RateLimitError();
```

---

## Tier 2 (10k–100k req/day)

**Trigger:** Sustained > 10k req/day for 5+ consecutive days, OR Vercel function invocation
costs > $500/month, OR p95 latency on `/api/tryon` exceeding 30s under load.

### Infrastructure Changes

| Component | Change | Rationale |
|-----------|--------|----------|
| Next.js hosting | Vercel Enterprise OR self-hosted on Railway/Fly.io with PM2 | Better cost predictability; custom resource limits |
| Redis | Redis Cloud 4GB+ with dedicated instance | Eliminate noisy-neighbour risk; enable memory policies |
| Workers | Auto-scaling on Kubernetes (HPA on queue depth) | Manual concurrency tuning cannot keep up with variable load |
| Storage | Cloudflare CDN in front of R2 | Global latency reduction; image cache at edge |
| Database reads | Supabase read replica for analytics queries | Offload heavy reporting queries; keep primary fast |
| Monitoring | Grafana dashboard wired to Redis, queue, and Sentry metrics | Operational visibility needed at this scale |

### Kubernetes HPA Configuration (example)

```yaml
# Auto-scale video workers based on BullMQ queue depth
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: tryon-video-worker
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: tryon-video-worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: External
    external:
      metric:
        name: bullmq_queue_depth
        selector:
          matchLabels:
            queue: tryon-video
      target:
        type: AverageValue
        averageValue: "5"  # Scale up when > 5 jobs waiting per worker
```

### CDN Configuration

Enable Cloudflare CDN in front of R2 for static assets:

1. Add a custom domain to your R2 bucket (e.g., `cdn.yourdomain.com`)
2. Enable Cloudflare proxy on the DNS record (orange cloud)
3. Set cache rules: Cache everything except `/studio/uploads/` (user uploads, short TTL)
4. For GLB avatar files (`/avatars/`): max cache TTL (1 year + cache busting on content hash)
5. For try-on results (`/studio/tryons/`): 90-day cache (matches R2 retention policy)

### Cost Optimisations at Tier 2

- Implement request hedging controls: limit simultaneous hedged requests with `MAX_HEDGE_CONCURRENCY`
- Enable aggressive generation caching: extend TTL from 24h to 72h for identical inputs
- Add cache warming for popular garments (top 100 product IDs pre-cached on daily schedule)
- Implement cost anomaly detection: alert if daily spend > 2x rolling average

---

## Tier 3 (100k–1M req/day)

**Trigger:** Sustained > 100k req/day for 7+ consecutive days, OR single-region latency SLA
breach for > 30% of users, OR infrastructure costs exceeding $5,000/month and growing.

### Infrastructure Changes

| Component | Change | Rationale |
|-----------|--------|----------|
| Next.js | Multi-region on Vercel Edge Network | < 50ms to edge for API routes; global user coverage |
| Redis | Redis Cluster 16GB+ with geo-replication | Low-latency cache and queue state per region |
| Video workers | 20+ workers across multiple availability zones | Eliminate single region as bottleneck |
| Avatar workers | 10 workers with GPU auto-scaling | SMPL-X pipeline needs GPU; auto-provision on demand |
| Meshy workers | 50 workers on spot/preemptible instances | Meshy gen is cost-intensive; spot instances reduce cost |
| Database | Supabase read replicas per region | DB reads from nearest replica; writes to primary |
| Analytics | Separate analytics DB (ClickHouse or BigQuery) | Decouple heavy analytics queries from operational DB |
| Storage | R2 multi-region replication | Eliminate cross-region bandwidth for image reads |
| GPU fleet | Reserved GPU instances (e.g., AWS g4dn.xlarge) | Reserved pricing reduces GPU cost by 40–60% vs on-demand |

### Worker Capacity Planning

At 1M req/day:

- Average QPS: ~12 req/s
- Peak QPS (assuming 10x peak factor): ~120 req/s
- Video try-on rate (assume 10% of requests): 12 req/s → with 90s processing = need 1,080 concurrent video workers at peak
- **Practical approach:** Not all 1M requests are video try-on. Segment traffic and scale each queue independently.

Realistic distribution at 1M req/day:
| Request Type | Estimated Share | Peak Workers Needed |
|-------------|----------------|-------------------|
| Image try-on (cached) | 50% | 0 workers (cache hit) |
| Image try-on (miss) | 30% | Sync; Vercel scales API routes |
| Video try-on | 10% | 20–50 video workers |
| Avatar generation | 5% | 10 avatar workers (GPU) |
| Model gen (meshy) | 5% | 50 meshy workers |

### Analytics Database (ClickHouse)

At > 100k req/day, the `usage_events` and `usage_logs` tables will accumulate > 3M rows/month.
Analytical queries (cohort analysis, cost breakdowns, per-org usage trends) become slow on
Supabase PostgreSQL.

Migration plan:
1. Dual-write `usage_events` to both Supabase and ClickHouse (no downtime)
2. Migrate analytics dashboards to query ClickHouse
3. After 90 days, stop writing to Supabase `usage_events`
4. Archive old Supabase usage data to R2 as Parquet files

---

## Scaling Decision Checklist

Before committing to a scaling investment, verify:

- [ ] Cache hit rate is measured and > 50% (scale AI provider capacity before infrastructure)
- [ ] Request deduplication is active (5s window in `requestDedup.ts`)
- [ ] Worker queue depth has been measured under load (not just estimated)
- [ ] Cost per request is known (via `usage_events` average)
- [ ] The bottleneck is confirmed with profiling (not assumed)

**Most common premature scaling mistake:** Adding workers before measuring whether the bottleneck
is worker capacity, provider API rate limits, or Redis throughput.

---

*Scaling roadmap: 2026-05-14 — VEXA v4.0 — Target: 1M req/day*
