# VEXA GPU Worker Scaling

## Overview

The VEXA avatar pipeline (`avatar-heavy` queue) is the only GPU-bound workload in the
system. It runs on a Python FastAPI service (`backend/main.py`) that wraps the SMPL-X
mesh generation pipeline. This document covers how to scale, protect, and cost-optimize
that layer.

---

## Architecture: Queue-Based GPU Dispatch

Next.js enqueues GPU work to Redis; the BullMQ worker forwards jobs to the Python service.
The GPU never receives requests directly from the browser.

```
Browser
  │
  ▼ POST /api/avatar/generate (Next.js)
      │
      ▼ enqueueJob('avatar-heavy', { userId, photoUrl, measurements })
            │
            ▼ Redis Queue: avatar-heavy
                  │
                  ▼ aiWorker.ts (Node.js BullMQ Worker)
                        │
                        ▼ POST http://AVATAR_SERVICE_URL/generate-avatar-full
                              │  (Bearer: INTERNAL_SERVICE_TOKEN)
                              ▼
                        Python FastAPI :8000
                              │
                              ▼ SMPL-X pipeline (CUDA)
                                    │
                                    ▼ GLB upload → Cloudflare R2
                                    ▼ return { glbUrl, status }
```

Key properties of this design:
- The GPU service is **never exposed to the internet** — it only accepts calls from
  workers bearing `INTERNAL_SERVICE_TOKEN`.
- The queue acts as a **backpressure buffer** — GPU instances are never overwhelmed by
  traffic spikes; jobs wait in Redis instead.
- Workers can be scaled independently of the GPU fleet.

---

## CUDA Worker Process Isolation

Run **one uvicorn worker process per physical GPU**. Do not run multiple workers sharing
one GPU device — CUDA context contention causes OOM errors and undefined latency.

```bash
# Single GPU (g4dn.xlarge — 1x T4)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 1

# Dual GPU (g4dn.2xlarge — 1x T4 — same as xlarge; use 2xlarge for 2x GPUs)
# Route via a load balancer to two separate uvicorn processes on different ports
uvicorn backend.main:app --host 0.0.0.0 --port 8001 --workers 1  # GPU 0
CUDA_VISIBLE_DEVICES=1 uvicorn backend.main:app --host 0.0.0.0 --port 8002 --workers 1  # GPU 1
```

**Isolation checklist:**
- Set `CUDA_VISIBLE_DEVICES` to the target device index on each process.
- Each process loads the SMPL-X model into its own GPU memory (~1.5 GB VRAM).
- No shared CUDA context between processes — each crashes independently.
- Health check endpoint `GET /health` responds within 2 s; use it for load balancer probes.

---

## Spot Instance Lifecycle: Drain Before Shutdown

Cloud spot instances (AWS) receive a 2-minute interruption notice via EC2 instance metadata
before termination.

**Drain procedure:**

1. Poll `http://169.254.169.254/latest/meta-data/spot/termination-time` every 30 s.
2. On interruption notice: stop the BullMQ worker from pulling new `avatar-heavy` jobs
   (`worker.pause()`).
3. Allow active jobs to complete (max 300 s timeout per job; jobs typically complete in
   60–120 s).
4. On timeout: mark active jobs as `failed` with reason `spot-interrupted` — they will
   retry via BullMQ's exponential backoff (3 attempts).
5. Gracefully shut down uvicorn (`SIGTERM`).

**State checkpointing:**
- SMPL-X pipeline does not support mid-run checkpointing (no intermediate state to save).
- Retries are the recovery mechanism — jobs retry up to 3 times on new instances.
- If a job fails all 3 retries, it is retained in Redis for 7 days and surfaced in
  `GET /api/admin/queues` as a `failed` job for operator review.

---

## AWS / GCP Instance Types for SMPL-X Workload

SMPL-X avatar generation requires a CUDA GPU with at least 8 GB VRAM.

| Instance | GPU | VRAM | vCPU | RAM | On-Demand $/hr | Spot $/hr (est.) | Recommendation |
|---|---|---|---|---|---|---|---|
| `g4dn.xlarge` | T4 | 16 GB | 4 | 16 GB | $0.526 | ~$0.16 | Best cost/perf for baseline |
| `g4dn.2xlarge` | T4 | 16 GB | 8 | 32 GB | $0.752 | ~$0.23 | More CPU headroom |
| `g5.xlarge` (AWS) | A10G | 24 GB | 4 | 16 GB | $1.006 | ~$0.30 | For larger batch sizes |
| `n1-standard-4 + T4` (GCP) | T4 | 16 GB | 4 | 15 GB | ~$0.56 | ~$0.17 | GCP alternative |
| `a2-highgpu-1g` (GCP) | A100 | 40 GB | 12 | 85 GB | $3.67 | ~$1.10 | Overkill for SMPL-X |

**Recommendation for VEXA:** Start with `g4dn.xlarge` spot instances. The T4 handles
SMPL-X + trimesh GLB export well within the 300 s timeout. Upgrade to `g4dn.2xlarge`
if CPU-bound preprocessing (mediapipe face detection) becomes the bottleneck.

---

## Cold Start Mitigation

GPU cold starts take 3–8 minutes (model weights load into VRAM, CUDA kernels compile).
This is unacceptable for interactive users.

**Strategy: Keep minimum 1 warm GPU instance always running.**

```
Instance fleet (auto-scaling group):
  ┌─────────────────────────────────┐
  │  1x g4dn.xlarge  (RESERVED)    │  ← always on, absorbs baseline
  │  0–4x g4dn.xlarge (SPOT)       │  ← scale up on queue depth
  └─────────────────────────────────┘
```

- The reserved instance runs 24/7 and handles steady-state traffic.
- Spot instances are added when `avatar-heavy` queue depth > 10 jobs.
- Spot instances are removed when queue depth < 2 jobs for 10 minutes.
- The reserved instance is never terminated by the autoscaler.

**Kubernetes warm pod:**

```yaml
# Set minReplicas: 1 in HPA — the warm pod is always present
minReplicas: 1
maxReplicas: 5
```

**FastAPI preload:** Load SMPL-X model weights at startup (not on first request):

```python
# backend/main.py — at module level
@app.on_event("startup")
async def preload_models():
    logger.info("Preloading SMPL-X model weights...")
    body_generator.warm_up()  # loads model into GPU memory
    logger.info("SMPL-X model warm — ready for requests")
```

---

## Cost Model

**Spot discount:** ~70% off on-demand price. A `g4dn.xlarge` spot instance costs ~$0.16/hr
vs. $0.526/hr on-demand.

| Deployment | Instance | Cost/hr | Cost/month (24/7) |
|---|---|---|---|
| Baseline (1x reserved) | g4dn.xlarge on-demand | $0.526 | ~$379 |
| Baseline (1x reserved) | g4dn.xlarge reserved 1yr | $0.186 | ~$134 |
| Scale-out (spot) | g4dn.xlarge spot | ~$0.16 | pay-per-use |
| Scale-out (spot, peak 4 pods) | 4x g4dn.xlarge spot | ~$0.64/hr | varies |

**Cost optimization checklist:**
1. Run baseline on 1-year reserved `g4dn.xlarge` (~64% savings vs. on-demand).
2. All scale-out capacity on spot instances.
3. Auto-scale down aggressively (10 min cooldown after queue drains).
4. Cache avatar results in R2 — repeat requests for the same `userId` + `measurements`
   hash skip the GPU entirely (cache TTL: 7 days; avatars are stable for a user session).

---

*GPU Scaling Guide — VEXA v4.0 — 2026-05-14*
