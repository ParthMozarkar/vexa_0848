# VEXA Migration Strategy

**Document Date:** 2026-05-14
**Version:** 1.0
**Audience:** Engineering leads, architects, CTO — decisions to make at scale inflection points

---

## Overview

This document defines three migration paths that address the most likely architectural
bottlenecks as VEXA scales. Each path has explicit trigger conditions — evaluate these metrics
before initiating any migration, as premature migration is expensive and risky.

| Path | Trigger | Timeline | Risk |
|------|---------|---------|------|
| [Path 1: DB Sharding](#path-1-db-sharding) | > 10M users or > 100M tryon_results rows | 3–6 months | High (data migration) |
| [Path 2: Microservices Split](#path-2-microservices-split) | Team > 10 engineers or services need independent scaling | 6–12 months/service | Medium (org + infra) |
| [Path 3: Multi-Region](#path-3-multi-region) | > 50% traffic from non-primary region or latency SLA breach | 1–3 months | Low (additive) |

**Recommended order:** Path 3 is fastest and lowest risk — start there if international
latency is an issue. Path 1 and 2 are longer-term architectural investments.

---

## Path 1: DB Sharding

### Trigger Conditions

Initiate this migration when **any two** of the following are true:

- `users` table exceeds **10M rows**
- `tryon_results` table exceeds **100M rows**
- Supabase single-instance query P95 latency on analytical queries exceeds **2 seconds**
- Supabase disk size approaching plan limit with > 50% of rows being `tryon_results` or `usage_events`

### Problem Statement

At 10M+ users, a single PostgreSQL instance becomes a write bottleneck.
The `tryon_results` and `usage_events` tables grow at O(users × activity) and are the
primary candidates for horizontal sharding by `org_id`.

### Migration Steps

#### Phase 1a: Add Shard Key to High-Volume Tables (Weeks 1–4)

The `tryon_results`, `usage_events`, and `usage_logs` tables must have `org_id` added as
an explicit column (it is currently derivable via joins, but not stored directly).

```sql
-- Add org_id shard key to tryon_results
ALTER TABLE tryon_results ADD COLUMN org_id UUID REFERENCES organizations(id);

-- Backfill org_id for existing rows (via user -> org_members join)
UPDATE tryon_results tr
SET org_id = om.org_id
FROM org_members om
WHERE om.user_id = tr.user_id;

-- Add index for shard-key queries
CREATE INDEX CONCURRENTLY idx_tryon_results_org_id ON tryon_results(org_id);

-- Repeat for usage_events, usage_logs
```

All application queries on `tryon_results` must be updated to include `org_id` in the
`WHERE` clause before sharding:

```typescript
// Before (causes full table scan at scale):
const { data } = await supabase
  .from('tryon_results')
  .select('*')
  .eq('user_id', userId);

// After (shard key in WHERE; enables distributed routing):
const { data } = await supabase
  .from('tryon_results')
  .select('*')
  .eq('org_id', orgId)       // shard key first
  .eq('user_id', userId);
```

#### Phase 1b: Migrate to Citus or PlanetScale (Weeks 5–12)

**Option A: Citus (PostgreSQL-compatible horizontal sharding)**

```bash
# 1. Provision Citus cluster (coordinator + worker nodes)
# Available on: Citus Cloud, Azure Cosmos DB for PostgreSQL, self-hosted

# 2. Distribute the high-volume tables on org_id shard key
SELECT create_distributed_table('tryon_results', 'org_id');
SELECT create_distributed_table('usage_events', 'org_id');
SELECT create_distributed_table('usage_logs', 'org_id');

# 3. Keep small tables as reference tables (replicated to all shards)
SELECT create_reference_table('organizations');
SELECT create_reference_table('clothing_assets');
SELECT create_reference_table('api_keys');
```

**Option B: PlanetScale (MySQL-based, Vitess sharding)**

PlanetScale requires a MySQL migration (from Supabase PostgreSQL). Use only if the team
has MySQL expertise and is willing to rewrite SQL-specific features (RLS, JSONB, etc.).

Recommendation: **Prefer Citus** — it maintains PostgreSQL compatibility, preserving all
existing queries, RLS policies, and Supabase-compatible client code.

#### Phase 1c: Dual-Write Migration (Zero Downtime)

```typescript
// Dual-write pattern: write to both old and new DB during migration
async function persistTryOnResult(result: TryOnResultInsert): Promise<void> {
  // Write to existing Supabase (source of truth during migration)
  await supabaseWrite.from('tryon_results').insert(result);

  // Write to new Citus cluster (becomes source of truth after cutover)
  if (MIGRATION_DUAL_WRITE_ENABLED) {
    await citusWrite.from('tryon_results').insert(result).catch(err => {
      console.warn('[migration] Citus dual-write failed:', err.message);
      // Non-fatal: old DB is still source of truth
    });
  }
}
```

**Cutover procedure:**
1. Enable dual-write for 2 weeks; verify Citus row counts match Supabase
2. Switch reads to Citus for 10% of traffic; monitor error rate
3. Gradually increase Citus read traffic to 100% over 1 week
4. Disable Supabase writes; archive old data
5. Total downtime: zero (rolling cutover)

**Timeline:** 3–6 months total (1 month prep, 2 months dual-write, 1 month cutover)

---

## Path 2: Microservices Split

### Trigger Conditions

Initiate this migration when **any one** of the following is true:

- Engineering team size exceeds **10 engineers** and deployment conflicts are a weekly problem
- A specific service (e.g., Try-On, Avatar) needs to scale independently (e.g., 10x the
  GPU workers) without scaling the entire monolith
- Regulatory requirement to isolate a service (e.g., separate EU data processing for GDPR)
- A service's technology stack needs to diverge (e.g., Avatar service needs to move to Python-only)

### Architecture Target

```
Internet
  |
  v  API Gateway (Next.js BFF — remains monolith)
  |    Responsibilities: Auth, rate limiting, request routing, response aggregation
  |
  +---> Auth Service         (Next.js microservice or Supabase edge function)
  |       Tables: users, api_keys, organizations, org_members
  |
  +---> Try-On Service       (Next.js microservice)
  |       Tables: tryon_results, video_jobs
  |       Queues: tryon-video
  |       External: TNB AI API
  |
  +---> Avatar Service       (Python FastAPI — already separate)
  |       Tables: avatars
  |       Queues: avatar-heavy
  |       External: SMPL-X pipeline
  |
  +---> Analytics Service    (Node.js or Python)
  |       Tables: usage_events, usage_logs, tenant_quotas
  |       External: ClickHouse (at Tier 3)
  |
  +---> Studio Service       (Next.js microservice)
          Tables: design_history, clothing_assets
          Queues: meshy-gen
          External: OpenAI, BlackBox
```

### Migration Steps

#### Phase 2a: Prepare Internal Service Token Pattern (1–2 weeks)

The `INTERNAL_SERVICE_TOKEN` pattern is already implemented for Next.js → Python communication.
Extend it to all service-to-service calls:

```typescript
// frontend/src/lib/internalFetch.ts
export async function internalFetch(
  serviceUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = process.env.INTERNAL_SERVICE_TOKEN;
  if (!token) throw new Error('INTERNAL_SERVICE_TOKEN not set');

  return fetch(`${serviceUrl}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30_000),
  });
}
```

#### Phase 2b: Extract Try-On Service (2–3 months)

The Try-On service is the highest-value extraction:

1. **Create new repo:** `vexa-tryon-service` (Node.js + TypeScript, same stack)
2. **Move route handlers:** `api/tryon/route.ts`, `api/tryon/video/route.ts`, `api/jobs/route.ts`
3. **Move lib modules:** `providers/`, `cache.ts`, `costTracker.ts`, `queues.ts`, `aiWorker.ts`
4. **API Gateway forwards:** The existing Next.js `/api/tryon` route becomes a thin proxy:
   ```typescript
   // frontend/src/app/api/tryon/route.ts (after extraction)
   export async function POST(req: NextRequest): Promise<NextResponse> {
     const { ctx, error } = await requireApiKey(req);
     if (error) return error;
     // Forward to Try-On microservice
     const response = await internalFetch(
       process.env.TRYON_SERVICE_URL!,
       '/tryon',
       { method: 'POST', body: await req.text() }
     );
     return new NextResponse(response.body, { status: response.status });
   }
   ```
5. **Deploy separately:** Try-On service on its own Railway/Fly.io instance with its own Redis
6. **Rollout:** 5% → 25% → 100% traffic over 2 weeks

**Timeline per service: 6–12 months** (includes testing, gradual rollout, team upskilling)

#### Phase 2c: Service-to-Service Auth

Each service validates the `INTERNAL_SERVICE_TOKEN` Bearer token before processing requests.
The same shared secret is deployed to all services via their respective environment variables.

For production at scale, consider replacing the shared secret with short-lived JWTs:

```typescript
// Service A issues a short-lived JWT for calling Service B
const serviceToken = jwt.sign(
  { iss: 'tryon-service', aud: 'analytics-service', exp: Math.floor(Date.now() / 1000) + 300 },
  process.env.SERVICE_JWT_SECRET!
);
```

---

## Path 3: Multi-Region

### Trigger Conditions

Initiate this migration when **any one** of the following is true:

- > **50% of traffic** originates from a region that is > 200ms from the primary Vercel region
- P95 latency SLA breach for users in a specific region (e.g., APAC users experiencing > 45s
  try-on latency due to Vercel cold starts or regional routing)
- Enterprise customer contract requires data residency in a specific region (EU, APAC)

### Migration Steps

#### Step 1: Deploy Next.js to Vercel Edge Network (1 week)

Vercel automatically routes users to the nearest edge region. No code changes needed for the
API routes (they run on Vercel's serverless functions per region). Enable:

1. Vercel Pro or Enterprise plan (required for edge functions)
2. Enable Edge Runtime for lightweight API routes (health checks, key validation):
   ```typescript
   // frontend/src/app/api/health/route.ts
   export const runtime = 'edge'; // Deploy to 300+ Vercel edge locations
   ```
3. AI-heavy routes remain on Node.js runtime (Edge runtime has 1MB limit, no Node.js APIs)

**Timeline: 1 week** (mostly configuration)

#### Step 2: Redis Geo-Replication (2–3 weeks)

Configure Redis with replicas in each active region:

- **Upstash Global:** Configure Upstash Redis with global replication (reads served from
  nearest region, writes go to primary). Single connection string; Upstash handles routing.
- **Redis Enterprise:** Deploy Redis Enterprise Cluster with Active-Active geo-distribution
  for Tier 3+ deployments.

```bash
# Upstash Global Redis configuration
# No code changes needed — Upstash handles geo-routing automatically
# Just update REDIS_URL to use the global endpoint:
REDIS_URL=rediss://default:PASSWORD@GLOBAL.upstash.io:6379
```

#### Step 3: Supabase Read Replicas (2–3 weeks)

Supabase Pro and Enterprise plans support read replicas per region:

1. Supabase dashboard → your project → Database → Replicas → Add Replica
2. Select target region (e.g., EU West, APAC)
3. Update application to route analytics/read-heavy queries to the nearest replica:
   ```typescript
   // For read-heavy queries (dashboard, usage reports):
   const replicaClient = createClient<Database>(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!,
     { db: { schema: 'public' }, auth: { persistSession: false } }
   );
   // Direct Supabase to use read replica for this session
   // (Supabase handles replica routing via connection pool settings)
   ```

#### Step 4: R2 Multi-Region Replication (1 week)

Cloudflare R2 multi-region replication (Cloudflare's object replication feature):

1. Enable R2 replication in Cloudflare dashboard
2. Configure source bucket (`vexa-assets`) and target region buckets
3. Replication is asynchronous — R2 objects available globally within seconds
4. CDN automatically serves from nearest region cache

**Timeline: 1–3 months total** (mostly parallel work; Steps 1 and 4 are fastest)

### Multi-Region Data Residency

For EU data residency requirements:

1. Create a separate Supabase project in an EU region (Frankfurt)
2. Write EU-origin user data to the EU project (tenant routing by IP geolocation)
3. Keep non-EU data in the primary project
4. This is a **legal/compliance decision** — engage legal counsel before implementing

---

## Migration Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Data loss during DB sharding migration | Low | Critical | Dual-write with verification; never delete from source until target verified |
| Service extraction introduces latency | Medium | High | Internal fetch with 30s timeout; monitor p95 after each rollout increment |
| Redis geo-replication lag causing stale cache | Medium | Low | Cache hits with stale data return slightly outdated but functional results; acceptable |
| Multi-region routing bug sends EU data to US | Low | Critical | Tenant routing unit tests; audit log review before cutover |
| Migration blocking feature development for 6+ months | High | Medium | Migrate one table/service at a time; other teams work in parallel |

---

## Pre-Migration Checklist

Before starting any migration path, complete:

- [ ] Baseline performance metrics captured (p50/p95/p99 latency, error rates, row counts)
- [ ] Dual-write infrastructure tested in staging
- [ ] Rollback plan documented with specific commands
- [ ] On-call engineer assigned for migration window
- [ ] B2B clients notified of maintenance window (48h advance notice)
- [ ] Feature freeze on affected services (no new deployments during migration)

---

*Migration strategy: 2026-05-14 — VEXA v4.0*
