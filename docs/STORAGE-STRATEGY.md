# VEXA Storage Strategy

## Overview

VEXA uses **Cloudflare R2** as the primary object store for all generated and uploaded
assets. R2 is accessed via the AWS S3-compatible API from both the Next.js frontend
(`frontend/src/lib/r2.ts`) and the Python backend (`backend/pipeline/r2_uploader.py`).

---

## R2 Bucket Structure

Single bucket: `vexa-assets` (configured via `R2_BUCKET_NAME` env var).

```
vexa-assets/
├── avatars/                    # SMPL-X GLB meshes — kept indefinitely
│   ├── <userId>/
│   │   ├── avatar.glb
│   │   └── face_texture.png
│
├── studio/
│   ├── tryons/                 # Try-on result images — 90-day lifecycle
│   │   └── <contentHash>.jpg   # Named by content hash for dedup
│   │
│   └── uploads/                # User-uploaded garment/person images
│       └── <contentHash>.<ext> # Named by content hash for dedup
│
└── clothing/                   # Retailer product images and 3D models
    ├── <productId>/
    │   ├── image.jpg
    │   └── model.glb           # immutable once created
```

**Key design principles:**
- All objects are keyed by content hash (SHA-256 of file content) — not by UUID or
  timestamp. This enables deduplication and immutable CDN caching.
- `avatars/` is per-user (userId as path prefix).
- `studio/tryons/` and `clothing/` use flat content-hash keys — no user prefix — so
  identical images uploaded by different users share a single stored copy.

---

## Lifecycle Policies

R2 lifecycle rules are configured in the Cloudflare dashboard or via the R2 API.

| Prefix | Retention | Action | Rationale |
|---|---|---|---|
| `studio/tryons/` | 90 days | Delete after expiry | Try-on results are ephemeral; users re-generate |
| `studio/uploads/` | 30 days | Delete after expiry | Source uploads not needed after processing |
| `avatars/` | Indefinite | No expiry | Avatars are user's persistent digital identity |
| `clothing/` | Indefinite | No expiry | Retailer assets are re-used across sessions |

**Configuration example (via Cloudflare API):**

```bash
curl -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/vexa-assets/lifecycle" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  --json '{
    "rules": [
      {
        "id": "expire-tryons",
        "status": "enabled",
        "filter": { "prefix": "studio/tryons/" },
        "expiration": { "days": 90 }
      },
      {
        "id": "expire-uploads",
        "status": "enabled",
        "filter": { "prefix": "studio/uploads/" },
        "expiration": { "days": 30 }
      }
    ]
  }'
```

---

## Upload Deduplication

Deduplication is already implemented in `frontend/src/lib/uploadDedup.ts`. The system
computes a content hash (SHA-256) of the file before upload and checks a Redis key
`upload:dedup:<hash>`. If the key exists, the existing R2 URL is returned without
re-uploading.

**Dedup flow:**

```
Client uploads file
  │
  ▼ Compute SHA-256(file bytes) → contentHash
  │
  ▼ Redis GET upload:dedup:<contentHash>
      ├── HIT  → return existing R2 URL (no upload, no R2 Class A operation cost)
      └── MISS → upload to R2 at key <prefix>/<contentHash>.<ext>
                  → Redis SET upload:dedup:<contentHash> <r2Url> EX 604800
                  → return new R2 URL
```

**Redis TTL:** 7 days (`CACHE_TTL_UPLOAD_DEDUP` in `scalingConfig.ts`). After TTL expires,
the next identical upload re-checks R2 via a HEAD request before uploading again.

---

## Versioning

R2 does not support object versioning natively (unlike S3 versioning). VEXA's content-hash
key strategy achieves the same goal with zero overhead:

- A different file version produces a different SHA-256 hash → different R2 key → both
  versions coexist at different URLs.
- The old URL remains valid until lifecycle expiry.
- No "overwrite and lose history" risk — content-addressed storage is append-only by design.
- To "delete" a version: remove the R2 object explicitly and purge the CDN cache entry.

**Implication:** Never use mutable keys like `avatars/<userId>/avatar-latest.glb`. Always
use `avatars/<userId>/<contentHash>.glb` and store the URL reference in Supabase.

---

## Cold Storage Tier

R2 currently offers two storage classes:
- **Standard** — low-latency access, $0.015/GB/month
- **Infrequent Access** — lower storage cost, higher retrieval cost (pricing subject to
  Cloudflare updates — check dashboard for current rates)

**Tiering strategy:**

| Age | Prefix | Action |
|---|---|---|
| 0–30 days | `studio/tryons/` | Standard storage (frequent CDN access) |
| 30–90 days | `studio/tryons/` | Move to Infrequent Access if access count drops |
| > 90 days | `studio/tryons/` | Delete (lifecycle policy) |
| Indefinite | `avatars/`, `clothing/` | Standard (accessed on every user session) |

**Implementation note:** R2 does not support automatic tier-transition rules yet (as of
2026). Implement via a scheduled Cloudflare Worker that lists objects older than 30 days
in `studio/tryons/` and re-uploads them with `StorageClass: STANDARD_IA` if the
Cloudflare API supports it; otherwise defer to the 90-day deletion lifecycle rule as the
primary cost control.

---

## Backup Strategy

R2 does not support cross-region replication natively. VEXA's backup approach:

| Bucket Prefix | Backup Method | RPO | RTO |
|---|---|---|---|
| `avatars/` | Scheduled export to AWS S3 (us-east-1) via rclone | 24 hours | 4 hours |
| `clothing/` | Scheduled export to AWS S3 (us-east-1) via rclone | 24 hours | 4 hours |
| `studio/tryons/` | No backup — ephemeral, re-generatable | N/A | Re-generate |
| `studio/uploads/` | No backup — re-uploadable by user | N/A | Re-upload |

**rclone sync command (run daily via cron or Cloudflare Worker cron trigger):**

```bash
rclone sync r2:vexa-assets/avatars/ s3:vexa-backup-us/avatars/ \
  --transfers 8 \
  --checkers 16 \
  --s3-storage-class STANDARD_IA
```

**Supabase backup:** The `avatar_url` column in the `users` table stores the canonical R2
URL. Supabase runs daily backups automatically — the URL reference is recovered via
Supabase restore even if the R2 object must be restored separately.

---

## Cost Estimate Table

Assumptions: average object size 500 KB (images), 5 MB (GLB files). Pricing based on
R2 standard rates as of 2026-05-14.

### At 1,000 objects total

| Category | Objects | Size | Storage cost/mo | Write ops cost | Read ops cost |
|---|---|---|---|---|---|
| `studio/tryons/` | 700 | 350 MB | $0.005 | $0.003 | $0.001 |
| `avatars/` | 200 | 1 GB | $0.015 | $0.001 | negligible |
| `clothing/` | 100 | 500 MB | $0.008 | $0.001 | negligible |
| **Total** | **1,000** | **~1.9 GB** | **~$0.03** | **~$0.005** | negligible |

### At 10,000 objects total

| Category | Objects | Size | Storage cost/mo | Write ops cost | Read ops cost |
|---|---|---|---|---|---|
| `studio/tryons/` | 7,000 | 3.5 GB | $0.05 | $0.03 | $0.01 |
| `avatars/` | 2,000 | 10 GB | $0.15 | $0.01 | negligible |
| `clothing/` | 1,000 | 5 GB | $0.08 | $0.005 | negligible |
| **Total** | **10,000** | **~18.5 GB** | **~$0.28** | **~$0.045** | ~$0.01 |

### At 100,000 objects total

| Category | Objects | Size | Storage cost/mo | Write ops cost | Read ops cost |
|---|---|---|---|---|---|
| `studio/tryons/` | 70,000 | 35 GB | $0.53 | $0.32 | $0.13 |
| `avatars/` | 20,000 | 100 GB | $1.50 | $0.09 | negligible |
| `clothing/` | 10,000 | 50 GB | $0.75 | $0.05 | negligible |
| **Total** | **100,000** | **~185 GB** | **~$2.78** | **~$0.46** | ~$0.13 |

Storage is not the cost driver at scale — AI provider calls dominate (see
`SCALING-RECOMMENDATIONS.md`). R2 storage remains well under $5/month even at 100k objects.

---

*Storage Strategy — VEXA v4.0 — 2026-05-14*
