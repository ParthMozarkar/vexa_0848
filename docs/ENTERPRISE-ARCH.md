# VEXA Multi-Tenant Architecture

**Document Date:** 2026-05-14
**Version:** 1.0
**Audience:** Senior engineers, enterprise architects, integration partners

---

## Table of Contents

1. [Multi-Tenant Architecture Overview](#1-multi-tenant-architecture-overview)
2. [Data Isolation Model](#2-data-isolation-model)
3. [Tenant Context Resolution](#3-tenant-context-resolution)
4. [Quota Enforcement Flow](#4-quota-enforcement-flow)
5. [Marketplace-to-Org Mapping](#5-marketplace-to-org-mapping)
6. [Security Boundaries](#6-security-boundaries)

---

## 1. Multi-Tenant Architecture Overview

VEXA serves three distinct caller classes from a single Next.js deployment. Tenant identity is
resolved per-request through the `resolveTenantContext()` function before any business logic runs.

```
                    +------------------------------------------+
                    |       VEXA API Gateway (Next.js)          |
                    |                                          |
                    |  x-vexa-key -> resolveTenantContext()    |
                    |       +-> orgId / marketplaceId / null   |
                    +------------------+------------------------+
                                       |  org_id scoped
              +------------------------+---------------------+
              v                        v                     v
     +------------------+   +------------------+   +------------------+
     |    Org A data    |   |    Org B data    |   |  Unauth / demo   |
     |    (isolated)    |   |    (isolated)    |   |  (IP rate limit) |
     |                  |   |                  |   |                  |
     |  tryon_results   |   |  tryon_results   |   |  2 tryons/IP/day |
     |  api_keys        |   |  api_keys        |   |  no persistence  |
     |  usage_logs      |   |  usage_logs      |   +------------------+
     |  tenant_quotas   |   |  tenant_quotas   |
     +------------------+   +------------------+
              |                        |
              +------------------------+
                         |
              +----------v-----------+
              |  Shared Infrastructure|
              |                      |
              |  AI Providers        |
              |  Redis Cache/Queues  |
              |  Cloudflare R2       |
              |  Supabase Auth       |
              +----------------------+
```

### Caller Classes

| Class | Identifier | Rate Limit | Data Scope | Features |
|-------|-----------|-----------|-----------|---------|
| B2B Marketplace Client | `x-vexa-key` header | Per-key `monthly_limit` | org_id isolated | Full API, persistent results, custom quotas |
| Authenticated End User | Supabase JWT Bearer | Per-user `MAX_AI_CALLS_PER_USER_DAY` | user_id scoped | Studio, avatar, try-on history |
| Anonymous / Demo | IP address | 2 tryons + 3 designs per IP per 24h | None (no persistence) | Studio demo only, no result storage |

---

## 2. Data Isolation Model

### Table Scoping

| Table | Scope Key | Isolation Level | Notes |
|-------|----------|----------------|-------|
| `api_keys` | `org_id` | Hard (RLS enforced) | Marketplace keys, hashed; one org can have multiple keys |
| `tryon_results` | `user_id` | Hard (RLS enforced) | Image try-on results; linked to creating user |
| `usage_logs` | `marketplace_id` | Hard (RLS enforced) | Per-request audit trail for billing |
| `usage_events` | `org_id` | Hard (RLS enforced) | Aggregated cost events for quota tracking |
| `tenant_quotas` | `org_id` | Hard (RLS enforced) | Monthly call quotas, burst caps per org |
| `video_jobs` | `user_id` | Hard (RLS enforced) | Async video job queue records |
| `avatars` | `user_id` | Hard (RLS enforced) | Generated GLB avatar files per user |
| `bookings` | `user_id` | Hard (RLS enforced) | Appointment bookings |
| `design_history` | `user_id` | Hard (RLS enforced) | AI design generation history |
| `organizations` | `org_id` (PK) | Hard (RLS enforced) | Org metadata, quota config |
| `org_members` | `org_id` | Hard (RLS enforced) | User-to-org membership |
| `users` | `id` (PK) | Hard (RLS enforced) | Auth users; global but row-level |
| `clothing_assets` | None (global) | Shared read | Product catalog; no PII; readable by all |
| `admin_logs` | None (global) | Admin-only write | System events; admin read-only |
| `ip_usage_limits` | `ip_address` | Shared | Rate-limit counters; no PII stored |

### Row Level Security Enforcement

All tables with `org_id` or `user_id` scope keys have RLS policies enforcing that:

1. `service_role` key (server-side only) can read/write all rows.
2. Authenticated users (`anon` key + JWT) can only access rows matching `auth.uid()`.
3. No row from Org A is ever readable or writable by Org B, even under concurrent load.

---

## 3. Tenant Context Resolution

Context resolution happens at two layers: middleware (lightweight) and route handler (full validation).

### Resolution Priority

```
Incoming request
       |
       v
[1] x-vexa-key header present?
       |--- YES --> validateApiKey() --> SHA-256 hash lookup in api_keys table
       |               |--- VALID: return { orgId, marketplaceId, keyId }
       |               +--- INVALID: return 401 Unauthorized
       |
       +--- NO --> [2] Authorization: Bearer <JWT> present?
                       |--- YES --> Supabase verifyJwt() --> decode uid
                       |               |--- VALID: return { userId, orgId (if member) }
                       |               +--- INVALID: return 401 Unauthorized
                       |
                       +--- NO --> [3] Anonymous / Demo mode
                                       --> IP rate limit check (ipRateLimit.ts)
                                       --> return { orgId: null, userId: null }
```

### Resolution Implementation

The `resolveTenantContext()` function (called in `apiKeyMiddleware.ts` and `middleware.ts`) returns
a `MarketplaceContext` object:

```typescript
// frontend/src/types/index.ts
interface MarketplaceContext {
  orgId: string | null;          // null for anonymous callers
  marketplaceId: string | null;  // null if not a B2B API call
  keyId: string | null;          // api_keys.id for audit trail
  userId: string | null;         // Supabase auth.uid() for JWT callers
  isAnonymous: boolean;
}
```

### Context Propagation

Once resolved, the context flows through every request:

- Scoped DB queries: all DB reads/writes include `WHERE org_id = $orgId` or `WHERE user_id = $userId`
- Usage logging: `usage_logs` row inserted with `marketplace_id` from context
- Quota checks: `tenant_quotas` lookup uses `orgId`
- Response headers: `x-vexa-org-id` echoed back for client-side debugging (non-secret)

---

## 4. Quota Enforcement Flow

Quotas are enforced at multiple layers to prevent single-tenant runaway costs from affecting others.

```
POST /api/tryon  (B2B API Key caller)
       |
       v
[1] Middleware (middleware.ts)
       --> validateApiKey() -- check api_keys.is_active
       --> increment api_keys.call_count
       --> check call_count <= monthly_limit
       |--- EXCEEDED: 429 Too Many Requests
       |
       v
[2] IP Rate Limit (ipRateLimit.ts)
       --> checkIpLimit(ip, 'tryon')
       --> ip_usage_limits table: tryon_count <= MAX_TRYON_PER_24H
       |--- EXCEEDED: 429 Too Many Requests (IP-level gate)
       |
       v
[3] User AI Budget (aiRateLimit.ts)
       --> checkDailyBudget(userId)
       --> Redis counter: ai_calls:{userId}:{date} <= MAX_AI_CALLS_PER_USER_DAY
       |--- EXCEEDED: 429 Too Many Requests (per-user gate)
       |
       v
[4] Org Tenant Quota (if configured in tenant_quotas)
       --> checkTenantQuota(orgId)
       --> tenant_quotas: monthly_used < monthly_cap
       |--- EXCEEDED: 429 Too Many Requests (org-level gate)
       |
       v
[5] Request Dedup (requestDedup.ts)
       --> 5s dedup window on input hash
       |--- DUPLICATE: return queued/cached result
       |
       v
[6] Generation Cache (cache.ts)
       --> Redis lookup: content hash key
       |--- HIT: return cached result (no AI call made, no quota consumed)
       |--- MISS: proceed to AI provider
       |
       v
[7] AI Provider Call (TNBProvider)
       --> trackProviderCall() -- log cost to usage_events
       --> incrementAIUsage() -- increment Redis daily counter
       --> return result
```

### Quota Configuration

| Quota Level | Enforced By | Default | Override |
|------------|------------|---------|---------|
| Monthly per-key | `api_keys.monthly_limit` | 1000 calls | Set per key at provisioning |
| Daily per-user | `MAX_AI_CALLS_PER_USER_DAY` env var | 10 calls | Increase env var |
| IP per-endpoint | `MAX_TRYON_PER_24H` constant | 2 tryons | Increase constant |
| Org-level monthly | `tenant_quotas.monthly_cap` | Null (unlimited) | Set row in `tenant_quotas` |

---

## 5. Marketplace-to-Org Mapping

### Current State (1:1 Mapping)

Each `marketplace_id` maps to exactly one `org_id`. When a marketplace API key is validated,
the `api_keys` table row contains both `marketplace_id` and `org_id` fields set to the same
logical entity.

```
marketplace_id: "shop_acme_us"
       |
       v
api_keys table row:
  { id, key_hash, marketplace_id: "shop_acme_us", org_id: "org_acme", is_active: true, ... }
       |
       v
All scoped queries use org_id: "org_acme"
```

### Future State (Many:1 Mapping)

The schema is designed to support multiple marketplace IDs mapping to a single org, enabling:

- A single enterprise customer to have multiple brand storefronts (different `marketplace_id` values)
  all sharing the same `org_id`, quota pool, and usage aggregation.
- White-label resellers issuing sub-keys per client while the org-level quota covers all.

```
marketplace_id: "shop_acme_us"  --+
marketplace_id: "shop_acme_eu"  --+--> org_id: "org_acme_global"
marketplace_id: "shop_acme_au"  --+
```

Implementation requires: adding a `marketplace_configs` table with `(marketplace_id, org_id)`
foreign key, and updating `validateApiKey()` to join on that table instead of reading `org_id`
from `api_keys` directly.

### Mapping Lookup Performance

The `api_keys` table has a unique index on `key_hash`. The full lookup path is:

1. SHA-256 hash the raw key from the `x-vexa-key` header (< 0.1ms)
2. Single indexed point lookup on `api_keys.key_hash` (< 1ms, cached by Supabase connection pool)
3. Return `org_id` and `marketplace_id` from the row

At scale (> 10k keys), add a Redis cache layer: `key:{hash} -> orgId` with 5-minute TTL to
avoid DB round-trips on every request.

---

## 6. Security Boundaries

| Boundary | Protection Mechanism | Failure Mode |
|----------|---------------------|-------------|
| B2B client → Next.js | `x-vexa-key` header; SHA-256 hashed in DB | Invalid key → 401, no data returned |
| End user → Next.js | Supabase JWT; verified server-side | Expired JWT → 401, no data returned |
| Next.js → Python backend | `INTERNAL_SERVICE_TOKEN` Bearer header | Missing/wrong token → 401 from FastAPI |
| Next.js → Provider APIs | Headers only (`X-API-Key`, `Authorization`); never in URLs | Missing key → provider 401; caught, 502 returned |
| Redis | `REDIS_URL` env var; TLS required in production | Missing URL → in-memory LRU fallback (no crash) |
| R2 Storage | Access Key + Secret; never exposed client-side | Missing creds → Supabase Storage fallback |
| Admin endpoints | `VEXA_ADMIN_KEY` required; constant-time comparison | Wrong key → 401 |
| Supabase service role | `SUPABASE_SERVICE_ROLE_KEY`; server-side only | Never in `NEXT_PUBLIC_*` vars |
| SSRF prevention | `/api/proxy` denies private IP ranges, `localhost`, metadata URLs | Blocked → 400 |

---

*Architecture document: 2026-05-14 — VEXA v4.0 Enterprise Scale*
