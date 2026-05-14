# VEXA CDN Strategy

## Overview

VEXA uses **Cloudflare R2** as the origin store and **Cloudflare CDN** (included with R2)
as the edge cache. The key economic advantage: R2 has zero egress fees, and Cloudflare CDN
does not charge for bandwidth served from R2-backed origins. This makes the combination
ideal for serving try-on result images, GLB/3D assets, and avatar textures.

---

## Cloudflare R2 + Cloudflare CDN Integration

R2 buckets can be connected to a Cloudflare Worker or a custom domain via a public bucket
URL. Cloudflare's CDN caches R2 responses at edge PoPs automatically based on
`Cache-Control` headers.

```
Client request for asset
        │
        ▼ Cloudflare CDN edge (PoP nearest to client)
            Cache HIT?
              ├── YES → serve from edge (< 10ms)
              └── NO  → fetch from R2 origin (< 100ms typically)
                           └── cache response at edge per Cache-Control
```

**Setup requirements:**
1. Connect R2 bucket to a Cloudflare Workers custom domain or enable the R2 public URL
   (`R2_PUBLIC_URL` env var).
2. Cloudflare CDN is automatically active for domains proxied through Cloudflare (orange
   cloud enabled in DNS).
3. Configure Cache Rules in Cloudflare dashboard or via Workers to override default
   `Cache-Control` behaviour per path.

---

## Cache-Control Policies by Asset Type

### Try-On Result Images (`studio/tryons/`)

Generated images are deterministic (same input → same output) and stored under a
content-hash key. Safe to cache aggressively.

```
Cache-Control: public, max-age=86400, s-maxage=604800
```

- `max-age=86400` — browser caches for 24 hours.
- `s-maxage=604800` — CDN edge caches for 7 days.
- No `must-revalidate` needed: content-hash key means stale responses are impossible.

### GLB / 3D Assets (`clothing/`, `avatars/*.glb`)

GLB files are stored under immutable content-hash keys. Once created, they never change.

```
Cache-Control: public, max-age=31536000, immutable
```

- `max-age=31536000` — browser caches for 1 year.
- `immutable` — tells the browser never to revalidate even on hard refresh.
- CDN honours `max-age` as `s-maxage` if no `s-maxage` is set explicitly — 1-year CDN
  cache is safe because the URL changes when the content changes.

### User-Uploaded Source Images (`studio/uploads/`, `avatars/`)

These are accessed by the backend during processing. Not served directly to browsers in
most flows, but if they are:

```
Cache-Control: private, no-store
```

Uploaded originals contain user PII (face photos). Never cache at a shared edge.

---

## Signed URL Caching

Presigned R2 URLs (used when the bucket is not public) expire after a short TTL. Caching
them at the edge is safe for the duration of their validity.

**Strategy:**
- Generate presigned URLs with a 5-minute expiry (`signedUrlExpirySeconds: 300`).
- Set `Cache-Control: public, s-maxage=240` on the API response that returns the signed
  URL (cache for 4 minutes — 60 s buffer before expiry).
- The Cloudflare edge serves the signed-URL response from cache for subsequent requests
  within the 4-minute window.
- After cache expiry, the edge re-fetches a fresh signed URL from the origin API.

**Note:** This pattern is valid only when the signed URL response does not contain auth
tokens beyond the pre-signed URL itself. Strip `Authorization` headers from the origin
response before caching (see Edge Rules section).

---

## Cache Purge Strategy

When an R2 object is deleted (e.g., lifecycle expiry of tryon results after 90 days), the
CDN must be told to evict the cached copy.

**Purge via Cloudflare API:**

```bash
curl -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://assets.vexa.ai/studio/tryons/<hash>.jpg"]}'
```

**Triggering purge:**
- R2 lifecycle rules run asynchronously — Cloudflare does not automatically purge CDN on
  R2 object deletion.
- Use a Cloudflare Worker with an R2 event trigger (`on object delete`) to call the purge
  API.
- Batch purge up to 30 URLs per API call to stay within Cloudflare limits.
- If purge fails, the CDN serves stale content until `s-maxage` expires (max 7 days for
  try-on images) — acceptable for deleted result images.

---

## Edge Rules

Apply these via Cloudflare Transform Rules or a Worker at the zone level:

### 1. Strip auth headers before caching

```
# Cloudflare Transform Rule (Request)
# Remove Authorization and Cookie headers from R2 origin requests
# so Cloudflare does not store per-user variants in cache

If URI path matches: /^\/studio\/|\/clothing\/|\/avatars\//
Then: Remove request header: Authorization
      Remove request header: Cookie
```

This ensures the CDN cache key is based on the URL only (+ Accept-Encoding), not per-user
credentials.

### 2. Vary on Accept-Encoding only

```
Vary: Accept-Encoding
```

Cloudflare CDN respects `Vary: Accept-Encoding` natively. Do **not** set
`Vary: Accept, Origin, Cookie` on cached assets — each variation creates a separate cache
entry and reduces hit rate dramatically.

### 3. No-cache for API responses

```
# API routes must not be cached at the edge
Cache-Control: no-store, no-cache
```

Apply to all `/api/*` paths via a Cloudflare Page Rule or Cache Rule with "Bypass Cache".

---

## Bandwidth Cost Table

| Scenario | R2 Egress | Cloudflare CDN | Notes |
|---|---|---|---|
| R2 → Cloudflare CDN (origin pull) | $0 | $0 | R2 to Cloudflare network is free |
| Cloudflare CDN → Browser (cache hit) | $0 | Free tier: unlimited | Standard Cloudflare CDN pricing |
| Cloudflare CDN → Browser (cache miss, paid plan) | $0 | $0.01–$0.08/GB | Pro/Business plans include large free allotments |
| R2 storage | $0.015/GB/month | — | First 10 GB/month free |
| R2 Class A operations (write) | $4.50/million | — | Per-upload cost |
| R2 Class B operations (read) | $0.36/million | — | Per-CDN-origin-fetch cost |

**Practical cost at 100k try-on results/month (avg 500 KB/image):**
- Storage: 100k × 0.5 MB × 90-day retention = ~4.5 TB peak → ~$67/month
- R2 writes: 100k × $4.50/M = $0.45/month
- CDN egress: $0 (R2 + Cloudflare = zero egress fees)

---

*CDN Strategy — VEXA v4.0 — 2026-05-14*
