# VEXA Worker Scaling

## Overview

VEXA uses BullMQ for all async AI workloads. Workers are Node.js processes that consume
jobs from Redis queues. Because BullMQ distributes work through Redis, multiple worker
processes for the same queue compete for jobs automatically — no coordination layer needed.

---

## BullMQ Horizontal Scaling

All worker instances connect to the **same Redis URL** (`REDIS_URL`). BullMQ's lock
mechanism ensures each job is processed by exactly one worker:

```
Redis Queue: tryon-video
        │
        ├── Worker Process A (Pod 1)  ← active: 2 jobs
        ├── Worker Process B (Pod 2)  ← active: 2 jobs
        └── Worker Process C (Pod 3)  ← active: 2 jobs
```

Rules:
- Workers are stateless — they hold no job state in memory beyond the active job duration.
- Each worker process manages concurrency internally (BullMQ `Worker.concurrency` option).
- Adding a worker pod immediately increases throughput; no restart of existing pods needed.
- Queue depth (waiting + delayed) is the shared signal across all instances.

---

## Concurrency Tuning

Configure per-queue concurrency via environment variables on the **worker process**. The
`scalingConfig.ts` module reads these at startup with safe defaults.

| Variable | Default | Description |
|---|---|---|
| `WORKER_CONCURRENCY_VIDEO` | `2` | Parallel `tryon-video` jobs per worker process |
| `WORKER_CONCURRENCY_AVATAR` | `1` | Parallel `avatar-heavy` jobs per worker process |
| `WORKER_CONCURRENCY_MESHY` | `3` | Parallel `meshy-gen` jobs per worker process |

**Guidance:**
- `avatar-heavy` is bound by the Python FastAPI GPU backend — keep concurrency at `1` per
  GPU instance. Increase only after adding GPU capacity.
- `meshy-gen` is I/O-bound (external API call) — safely runs at 5–20 concurrency.
- `tryon-video` sends long-running HTTP calls to TNB (up to 300 s) — set concurrency equal
  to the number of TNB API key slots available.

**Recommended settings by environment:**

| Queue | Dev | Staging | Prod < 1k/day | Prod > 10k/day |
|---|---|---|---|---|
| `tryon-video` | 1 | 2 | 3 | 10–20 |
| `avatar-heavy` | 1 | 1 | 2 | 5 |
| `meshy-gen` | 1 | 2 | 5 | 20 |

---

## Auto-Scaling Trigger

Scale out (add worker pods) when queue depth exceeds threshold for more than 5 minutes.

**Threshold table:**

| Queue | Min Workers | Max Workers | Scale-Up Trigger | Scale-Down Trigger |
|---|---|---|---|---|
| `tryon-video` | 1 | 10 | waiting > 50 jobs | waiting < 10 jobs for 10 min |
| `avatar-heavy` | 1 | 5 | waiting > 10 jobs | waiting < 2 jobs for 10 min |
| `meshy-gen` | 1 | 20 | waiting > 100 jobs | waiting < 20 jobs for 10 min |

Expose queue depth as a Prometheus metric from `GET /api/admin/queues`. Kubernetes HPA or
KEDA (Kubernetes Event-Driven Autoscaler) can query this endpoint or the Redis queue
directly to drive pod scaling.

---

## Graceful Shutdown

Workers MUST drain active jobs before terminating. BullMQ's `Worker.close()` method waits
for active jobs to complete up to a configurable timeout.

**SIGTERM handler (aiWorker.ts pattern):**

```typescript
process.on('SIGTERM', async () => {
  console.info('[worker] SIGTERM received — draining active jobs...');
  // Stop accepting new jobs immediately
  await worker.pause();
  // Wait up to 30 s for active jobs to complete
  const drainTimeout = setTimeout(() => {
    console.warn('[worker] Drain timeout exceeded — forcing close');
    process.exit(1);
  }, 30_000);
  await worker.close();
  clearTimeout(drainTimeout);
  console.info('[worker] All jobs drained — exiting cleanly');
  process.exit(0);
});
```

**Kubernetes terminationGracePeriodSeconds** must be set to at least 60 s to allow the
longest job type (`tryon-video`, 300 s timeout) to complete if already active. Typical
setting: `terminationGracePeriodSeconds: 360`.

---

## Worker Health Signal

`GET /api/admin/queues` (protected by `VEXA_ADMIN_KEY`) returns live queue metrics. The
autoscaler uses this as the primary health and depth signal.

**Response shape:**

```json
{
  "queues": [
    {
      "name": "tryon-video",
      "waiting": 12,
      "active": 3,
      "completed": 4820,
      "failed": 7,
      "delayed": 0
    },
    {
      "name": "avatar-heavy",
      "waiting": 2,
      "active": 1,
      "completed": 1203,
      "failed": 2,
      "delayed": 0
    },
    {
      "name": "meshy-gen",
      "waiting": 45,
      "active": 8,
      "completed": 9210,
      "failed": 14,
      "delayed": 0
    }
  ]
}
```

**Health check rules for autoscaler:**
- HTTP 200 + `failed` count not growing → healthy
- HTTP non-2xx or connection timeout → worker pod unhealthy → replace immediately
- `waiting` count > threshold for > 5 min → trigger scale-out

---

## Kubernetes Deployment Sketch

Workers run as a **separate Deployment** from the Next.js frontend. Each queue type can
optionally be its own Deployment for independent scaling.

```yaml
# worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vexa-worker
  labels:
    app: vexa-worker
spec:
  replicas: 2  # baseline; HPA increases this
  selector:
    matchLabels:
      app: vexa-worker
  template:
    metadata:
      labels:
        app: vexa-worker
    spec:
      terminationGracePeriodSeconds: 360
      containers:
        - name: worker
          image: vexa-worker:latest
          command: ["node", "dist/aiWorker.js"]
          env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: vexa-secrets
                  key: REDIS_URL
            - name: WORKER_CONCURRENCY_VIDEO
              value: "2"
            - name: WORKER_CONCURRENCY_AVATAR
              value: "1"
            - name: WORKER_CONCURRENCY_MESHY
              value: "3"
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]  # allow load balancer drain

---
# KEDA ScaledObject — scale on Redis queue depth
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: vexa-worker-scaler
spec:
  scaleTargetRef:
    name: vexa-worker
  minReplicaCount: 1
  maxReplicaCount: 20
  cooldownPeriod: 600  # 10 min scale-down cooldown
  triggers:
    - type: redis
      metadata:
        address: redis:6379
        listName: "bull:meshy-gen:wait"
        listLength: "100"
    - type: redis
      metadata:
        address: redis:6379
        listName: "bull:tryon-video:wait"
        listLength: "50"
```

**HPA alternative** (without KEDA): Expose queue depth as a custom metric via Prometheus
Adapter, then use `HorizontalPodAutoscaler` with `type: External` pointing to the metric.

---

*Worker Scaling Guide — VEXA v4.0 — 2026-05-14*
