# VEXA SLA Architecture

**Document Date:** 2026-05-14
**Version:** 1.0
**Audience:** Engineering leadership, B2B clients, on-call engineers

---

## Table of Contents

1. [SLA Commitment Table](#1-sla-commitment-table)
2. [Health Check Endpoints](#2-health-check-endpoints)
3. [Alerting Thresholds](#3-alerting-thresholds)
4. [On-Call Guide](#4-on-call-guide)

---

## 1. SLA Commitment Table

### Latency Targets

| Endpoint | Method | p50 | p95 | p99 | Notes |
|----------|--------|-----|-----|-----|-------|
| `/api/health` | GET | < 50ms | < 100ms | < 200ms | Always fast; no DB or AI calls |
| `/api/tryon` | POST | < 8s | < 25s | < 45s | Cache hit: < 100ms; miss: TNB API call 5–30s |
| `/api/tryon/video` | POST | < 500ms | < 1s | < 2s | Returns jobId immediately; processing is async |
| `/api/jobs/[id]` | GET | < 200ms | < 500ms | < 1s | Redis poll; fast |
| `/api/upload` | POST | < 3s | < 8s | < 15s | R2 upload; larger files are slower |
| `/api/studio/design` | POST | < 10s | < 30s | < 50s | DALL-E 3 generation time |
| `/api/studio/trends` | POST | < 3s | < 8s | < 15s | GPT-4o-mini text generation |
| `/api/avatar/generate` | POST | < 500ms | < 1s | < 2s | Returns jobId immediately; async processing |
| `/api/keys/validate` | GET | < 100ms | < 200ms | < 400ms | Single DB lookup + hash compare |
| `/api/admin/providers` | GET | < 500ms | < 1s | < 2s | Parallel health checks to all providers |

### Video Try-On End-to-End Targets

| Phase | p50 | p95 | Notes |
|-------|-----|-----|-------|
| Job enqueue to active | < 2s | < 10s | Depends on worker concurrency and queue depth |
| TNB video processing | < 90s | < 240s | TNB API SLA; 300s timeout set in worker |
| Total end-to-end | < 2min | < 5min | From POST to result available in GET /api/jobs |

### Avatar Generation End-to-End Targets

| Phase | p50 | p95 | Notes |
|-------|-----|-----|-------|
| Job enqueue to active | < 5s | < 30s | Avatar queue has lower concurrency (1 worker) |
| SMPL-X pipeline | < 30s | < 90s | Depends on GPU; CPU fallback: < 5min |
| Total end-to-end | < 60s | < 3min | From POST to GLB URL available |

### Uptime Targets

| Tier | Uptime | Max Downtime/Month | Applies To |
|------|--------|-------------------|-----------|
| Synchronous API | 99.9% | 43.8 minutes | `/api/tryon`, `/api/upload`, `/api/health` |
| Async queue processing | 99.5% | 3.6 hours | Video try-on, avatar, meshy-gen workers |
| Admin endpoints | 99.0% | 7.2 hours | `/api/admin/*` |

**Note:** Uptime excludes scheduled maintenance windows (announced 48h in advance) and
upstream provider outages (TNB, Supabase, Cloudflare).

---

## 2. Health Check Endpoints

### Primary Health Check

```
GET /api/health
Authentication: None required
```

Checks: API server reachability, Redis connectivity, Supabase connectivity.

Response when healthy:
```json
{
  "status": "ok",
  "timestamp": "2026-05-14T10:00:00Z",
  "redis": true,
  "db": true,
  "version": "4.0.0"
}
```

Response when degraded (Redis down, fallback active):
```json
{
  "status": "ok",
  "timestamp": "2026-05-14T10:00:00Z",
  "redis": false,
  "db": true,
  "version": "4.0.0"
}
```

Response when critical (DB down):
```json
{
  "status": "error",
  "timestamp": "2026-05-14T10:00:00Z",
  "redis": true,
  "db": false
}
```

HTTP status: `200` for ok/degraded, `503` for error.

### Queue Dashboard

```
GET /api/admin/queues
Authentication: x-vexa-admin-key header required
```

Returns BullMQ queue depths and processing rates for all three queues.

Response:
```json
{
  "queues": {
    "tryon-video": {
      "waiting": 0,
      "active": 1,
      "completed": 142,
      "failed": 2,
      "concurrency": 2
    },
    "avatar-heavy": {
      "waiting": 0,
      "active": 0,
      "completed": 38,
      "failed": 0,
      "concurrency": 1
    },
    "meshy-gen": {
      "waiting": 3,
      "active": 3,
      "completed": 67,
      "failed": 1,
      "concurrency": 3
    }
  },
  "timestamp": "2026-05-14T10:00:00Z"
}
```

Alert if `waiting` depth grows beyond threshold (see Section 3).

### Provider Health

```
GET /api/admin/providers
Authentication: x-vexa-admin-key header required
```

Returns health status for all registered AI providers.

Response:
```json
{
  "providers": [
    { "name": "TNBProvider", "healthy": true, "latencyMs": 142 },
    { "name": "OpenAIProvider", "healthy": true, "latencyMs": 88 },
    { "name": "BlackBoxProvider", "healthy": false, "latencyMs": 0, "detail": "HTTP 503" }
  ],
  "timestamp": "2026-05-14T10:00:00Z"
}
```

### Python Backend Health

```
GET {AVATAR_SERVICE_URL}/health
Authentication: None required (internal network only)
```

Response when healthy:
```json
{
  "status": "healthy",
  "service": "vexa-avatar",
  "smplx_loaded": true
}
```

Use this in uptime monitors for the Python service.

### Uptime Monitor Configuration

Configure the following monitors in UptimeRobot, Better Uptime, or equivalent:

| Monitor | URL | Interval | Alert threshold |
|---------|-----|----------|----------------|
| Frontend health | `https://your-domain.vercel.app/api/health` | 60s | 2 consecutive failures |
| Backend health | `https://your-python-service/health` | 60s | 2 consecutive failures |

---

## 3. Alerting Thresholds

These thresholds are derived from `slaMonitor.ts` `SLA_TARGETS` and operational experience.
Configure these in Sentry Performance, Grafana, or equivalent:

### Latency Alerts (P95 thresholds)

| Endpoint | Warning | Critical | Action |
|----------|---------|---------|--------|
| `/api/tryon` | > 20s P95 | > 40s P95 | Check TNB latency; check Sentry for retry storms |
| `/api/upload` | > 10s P95 | > 20s P95 | Check R2 status; verify no unusually large files |
| `/api/studio/design` | > 25s P95 | > 45s P95 | Check OpenAI API status and rate limits |
| `/api/health` | > 500ms P95 | > 2s P95 | Check Redis and Supabase connectivity |

### Error Rate Alerts

| Metric | Warning | Critical | Action |
|--------|---------|---------|--------|
| `/api/tryon` 5xx rate | > 5% (5min) | > 20% (5min) | Run Runbook 1 (TNB Provider Outage) |
| `/api/upload` 5xx rate | > 2% (5min) | > 10% (5min) | Run Runbook 4 (R2 Storage Outage) |
| Any route 5xx rate | > 1% (5min) | > 5% (5min) | Check Supabase; run Runbook 3 if DB errors |
| Auth failure rate | > 1% (5min) | > 5% (5min) | Check for key rotation issues; verify RLS |

### Queue Depth Alerts

| Queue | Warning | Critical | Action |
|-------|---------|---------|--------|
| `tryon-video` waiting | > 10 jobs | > 50 jobs | Check worker is running; check TNB rate limits |
| `avatar-heavy` waiting | > 5 jobs | > 20 jobs | Check Python service health; check GPU availability |
| `meshy-gen` waiting | > 15 jobs | > 100 jobs | Check BlackBox API; increase `WORKER_CONCURRENCY_MESHY` |

### Cost Alerts (via usage_events table)

| Metric | Warning | Critical | Action |
|--------|---------|---------|--------|
| Daily TNB spend | > $50/day | > $100/day | Check for dedup bypass; check for org quota override |
| Single org daily calls | > 500 calls | > 1000 calls | Verify tenant quota is set; check for automation abuse |

### Infrastructure Alerts

| Metric | Warning | Critical | Action |
|--------|---------|---------|--------|
| Redis memory usage | > 70% | > 90% | Increase Redis plan; purge old cache keys |
| Supabase DB size | > 500MB free tier | > 80% of plan | Upgrade plan; archive old tryon_results |

---

## 4. On-Call Guide

### Who Gets Paged

| Severity | First Responder | Escalation | Escalation Timeout |
|----------|----------------|-----------|-------------------|
| P1 (service down) | On-call engineer (rotation) | Tech Lead | 15 minutes |
| P2 (degraded performance) | On-call engineer | Tech Lead | 45 minutes |
| P3 (minor issue, no user impact) | Next business day | — | — |

### Severity Classification

| Severity | Criteria | Examples |
|----------|---------|---------|
| P1 | Core feature unavailable, > 10% of users affected | Try-on fully down, DB failure, auth broken |
| P2 | Core feature degraded, or minor feature unavailable | Redis down (cache miss, queues paused), R2 down (fallback active), latency > 2x normal |
| P3 | No user-facing impact, monitoring noise | Non-critical Sentry warning, slow admin endpoint |

### On-Call Rotation

- Schedule: weekly rotation, handover every Monday 09:00 local time
- Tools: PagerDuty (configure with Sentry + UptimeRobot integrations)
- Escalation contact: Tech Lead (see internal contact list)

### War Room Procedure

Triggered for P1 incidents:

1. **T+0:** On-call engineer acknowledges the alert in PagerDuty
2. **T+2min:** Open war room Slack thread: `#incident-YYYY-MM-DD-<slug>`
3. **T+5min:** Post initial assessment: confirmed scope, active runbook, ETA
4. **T+15min:** Post progress update (even if no change — silence is worse than updates)
5. **T+30min (no resolution):** Escalate to Tech Lead; post escalation notice in thread
6. **Resolution:** Post resolution summary in thread; update status page
7. **T+24h:** Write post-mortem; share in `#engineering`

### Communication Templates

**Initial notification (to B2B clients):**
```
Subject: [VEXA] Service Disruption - [Feature]

We are currently experiencing an issue affecting [feature] as of [TIME UTC].
Impact: [describe user-facing impact]
We are actively investigating and working to restore service.
Updates will be provided every 15 minutes.
ETA for resolution: [time or "unknown"]
```

**Resolution notification:**
```
Subject: [VEXA] Service Restored - [Feature]

The issue affecting [feature] has been resolved as of [TIME UTC].
Root cause: [brief description]
Duration: [X minutes/hours]
Action taken: [brief description]
We apologize for the disruption. A full post-mortem will be published within 24 hours.
```

---

*SLA architecture document: 2026-05-14 — VEXA v4.0*
