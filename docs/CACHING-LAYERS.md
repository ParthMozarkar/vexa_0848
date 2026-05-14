# VEXA Caching Layers

## Overview

VEXA uses a 4-layer cache hierarchy to minimise latency and AI provider costs. Each layer
has a distinct scope, TTL, and invalidation mechanism. A request is served from the
fastest available layer; only on a full miss does it reach the provider.

---

## Cache Topology Diagram

```
Inbound Request
        │
        ▼
┌────────────────────────────────────────────────────────────┐
│  Layer 1: Cloudflare CDN (Edge)                            │
│                                                            │
│  Scope:    Static assets only (GLB, result images)         │
│  TTL:      GLB/3D: max-age=31536000, immutable             │
│            Result images: s-maxage=604800 (7 days)         │
│  Key:      URL (strip auth headers — Vary: Accept-Encoding) │
│  Miss:     Passes to Layer 2 / origin server               │
└────────────────────────────────────────────────────────────┘
        │ Cache MISS (or non-cacheable request)
        ▼
┌────────────────────────────────────────────────────────────┐
│  Layer 2: Redis (Server-side, Shared)                      │
│                                                            │
│  Scope:    AI generation results, upload dedup, URL lookups │
│  TTL:      Generation results: 86400 s (24 h)              │
│            Upload dedup: 604800 s (7 days)                 │
│            Image URL resolution: 3600 s (1 h)              │
│  Key:      Structured (see Key Format section)             │
│  Miss:     Falls through to Layer 3 (in-memory LRU)        │
└────────────────────────────────────────────────────────────┘
        │ Cache MISS
        ▼
┌────────────────────────────────────────────────────────────┐
│  Layer 3: In-Memory LRU (Process-level)                    │
│                                                            │
│  Scope:    Hot generation results and URL resolutions       │
│  TTL:      Mirrors Redis TTL (evicted on process restart)  │
│  Capacity: 500 entries max (CACHE_LRU_MAX_ENTRIES)         │
│  Key:      Same key as Redis                               │
│  Miss:     Falls through to Provider call (Layer 4)        │
└────────────────────────────────────────────────────────────┘
        │ Cache MISS
        ▼
┌────────────────────────────────────────────────────────────┐
│  Layer 4: Provider Call (TNB, OpenAI, BlackBox, Python)    │
│                                                            │
│  Scope:    Live AI inference — no caching here             │
│  Result:   Stored at Layer 2 + Layer 3 on return           │
│  Cost:     $0.05 (TNB), $0.04 (OpenAI image), $0.02 (BB)  │
└────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Cloudflare CDN

**What is cached:** Static assets served from Cloudflare R2 via the public CDN domain.
This layer does NOT cache API responses — only binary assets.

| Asset type | Cache-Control | CDN TTL |
|---|---|---|
| GLB / 3D models | `public, max-age=31536000, immutable` | 1 year |
| Try-on result images | `public, max-age=86400, s-maxage=604800` | 7 days (CDN), 1 day (browser) |
| User-uploaded source images | `private, no-store` | Not cached |
| API responses (`/api/*`) | `no-store, no-cache` | Not cached |

**Cache key format:**

```
https://assets.vexa.ai/<prefix>/<contentHash>.<ext>
```

Examples:
- `https://assets.vexa.ai/studio/tryons/a3f9b2c1d4e5.jpg`
- `https://assets.vexa.ai/clothing/p9x7k2m1/model.glb`

The content hash IS the cache key. No separate cache-key computation needed — CDN caches
by URL only.

**Invalidation triggers:**
- R2 object deleted (lifecycle or manual) → purge via Cloudflare API (see CDN-STRATEGY.md)
- CDN cache is NOT invalidated on R2 object reads or status changes
- `x-cache-bypass: true` request header → Cloudflare Worker strips cache and fetches from
  origin (set via Transform Rule or Worker script)

---

## Layer 2: Redis

**What is cached:** AI generation results (expensive provider calls), upload dedup
fingerprints, and resolved public URLs for proxy images.

| Cache type | Key format | TTL | Stored value |
|---|---|---|---|
| Generation result | `gen:<sha256(userId+inputs)>` | 86400 s | `{ resultUrl, fitLabel, fitScore, status }` (JSON) |
| Upload dedup | `upload:dedup:<sha256(fileBytes)>` | 604800 s | R2 URL string |
| Image URL resolution | `imgres:<sha256(originalUrl)>` | 3600 s | Resolved public URL string |

**Cache key format — generation result:**

```typescript
// cache.ts
const cacheKey = `gen:${sha256(userId + personImageUrl + garmentImageUrl + category)}`;
```

The key hashes the combination of all inputs that determine the output. If any input
changes, a different key is produced and the entry is a miss.

**Cache key format — upload dedup:**

```typescript
// uploadDedup.ts
const dedupKey = `upload:dedup:${sha256(fileBuffer)}`;
```

**Invalidation triggers:**
- TTL expiry (primary mechanism — no active invalidation for generation results)
- Manual purge via `DEL <key>` (admin-only, no automated trigger)
- `x-cache-bypass: true` header → skip Redis lookup, re-call provider, update Redis entry

**Redis sizing impact:**
- Generation result entries: ~2 KB JSON × 24h TTL × N req/day
- Upload dedup entries: ~100 bytes × 7-day TTL × N uploads/day
- See `SCALING-RECOMMENDATIONS.md` for memory estimates by traffic volume

---

## Layer 3: In-Memory LRU

**What is cached:** A hot subset of the Redis cache, held in the Node.js process heap.
Avoids a Redis round-trip (~1–3 ms) for the most frequently accessed entries.

**Implementation:** Node.js `Map`-based LRU with a 500-entry cap and TTL mirrors Redis.
When the process restarts, Layer 3 starts empty — Layer 2 (Redis) fills it on subsequent
misses.

| Property | Value |
|---|---|
| Max entries | 500 (`CACHE_LRU_MAX_ENTRIES`) |
| Eviction policy | LRU (least recently used) |
| TTL | Same as the Redis entry that populated it |
| Scope | Per-process (not shared across Next.js instances) |

**Cache key:** Identical to the Redis key — no transformation needed.

**Invalidation triggers:**
- Process restart (full eviction)
- LRU eviction when 500-entry cap is reached
- `x-cache-bypass: true` header → skip in-memory lookup and Redis lookup

**Note:** In multi-instance Next.js deployments (e.g., Vercel with multiple instances),
each instance has its own Layer 3 LRU. This is acceptable — Layer 2 (Redis) is the
shared source of truth. The LRU merely reduces Redis round-trips, not cross-instance
consistency.

---

## Layer 4: Provider Call

**What is NOT cached here:** Layer 4 is the live AI provider. Results are always stored
back to Layer 2 + Layer 3 immediately after a successful call.

**Write-through caching protocol:**

```typescript
// After a successful provider call in cache.ts:
const result = await provider.call(inputs);            // Layer 4
await redis.set(cacheKey, JSON.stringify(result), 'EX', ttl);  // → Layer 2
lruCache.set(cacheKey, result);                        // → Layer 3
return result;
```

**Providers and costs:**

| Provider | Used for | Estimated cost/call |
|---|---|---|
| TNB (The New Black) | Image try-on, video try-on | $0.05 |
| OpenAI DALL-E 3 | Design generation images | $0.04 |
| BlackBox | 3D model generation | $0.02 |
| Python FastAPI | SMPL-X avatar | ~$0.005 (GPU compute) |

---

## x-cache-bypass Header

To force a fresh provider call and update all cache layers:

```
x-cache-bypass: true
```

**Processing logic:**

```typescript
const bypass = req.headers.get('x-cache-bypass') === 'true';

if (!bypass) {
  const lruHit = lruCache.get(cacheKey);
  if (lruHit) return lruHit;                    // Layer 3 hit

  const redisHit = await redis.get(cacheKey);
  if (redisHit) {
    lruCache.set(cacheKey, JSON.parse(redisHit)); // Warm Layer 3
    return JSON.parse(redisHit);                  // Layer 2 hit
  }
}

// Miss or bypass → Layer 4
const result = await provider.call(inputs);
await redis.set(cacheKey, JSON.stringify(result), 'EX', ttl);
lruCache.set(cacheKey, result);
return result;
```

**Authorization:** Only authenticated users (Bearer token or `x-vexa-key`) should be
permitted to set this header. Unauthenticated bypass requests must be rejected (prevents
abuse of provider budget by cache-bypassing without auth).

---

## Cache Warming Strategy

Pre-populate cache for predictable high-traffic items before they are requested organically.

### Warm try-on results for hero product catalogue

```typescript
// warming script (run on deploy or nightly cron)
for (const product of hotProducts) {
  for (const canonicalUserImage of warmingSet) {
    await callTryon({ personImageUrl: canonicalUserImage, garmentImageUrl: product.imageUrl });
    // First call hits Layer 4; result stored at Layer 2 + 3
    // Subsequent real user requests hit Layer 2 (Redis)
  }
}
```

### Pre-resolve frequently accessed URLs

Run the image resolution cache warm-up on startup for all product images in the catalogue:

```typescript
for (const url of productImageUrls) {
  await resolveToPublicUrl(url);  // Hits proxy + stores in Redis at imgres: key
}
```

### Cache hit rate monitoring

Track the ratio of Layer 2 hits to Layer 4 calls via `costTracker.ts`. Target cache hit
rate of > 60% on `tryon` at steady state (see `SCALING-RECOMMENDATIONS.md` for cost
impact at 60% hit rate).

---

*Caching Layers — VEXA v4.0 — 2026-05-14*
