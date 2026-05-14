# VEXA Emergency Recovery Runbooks

**Document Date:** 2026-05-14
**Version:** 1.0
**Audience:** On-call engineers, SRE team, incident commanders
**Update cadence:** Review after each incident; update RTO targets after load testing

---

## Quick Reference

| Runbook | Scenario | RTO | Severity |
|---------|---------|-----|---------|
| [Runbook 1](#runbook-1-tnb-provider-outage) | TNB Provider Outage | 15 min (with fallback ready) | P1 — Core feature down |
| [Runbook 2](#runbook-2-redis-failure) | Redis Failure | 10 min | P2 — Degraded performance |
| [Runbook 3](#runbook-3-supabase-db-failure) | Supabase DB Failure | 4h full / 30min read-only | P1 — All APIs 500 |
| [Runbook 4](#runbook-4-r2-storage-outage) | R2 Storage Outage | 5 min (auto-fallback) | P2 — Results served from Supabase Storage |

**Incident communication channel:** Create a war room Slack thread with format `#incident-YYYY-MM-DD-<slug>`

---

## Runbook 1: TNB Provider Outage

**When to use:** Image try-on or video try-on returns errors. Sentry alerts on `AIError` for
TNB provider. Error rate on `/api/tryon` exceeds 20%.

**Impact:** Virtual try-on is the core VEXA feature. All B2B clients and end users are affected.

---

### Step 1 — Detection

Monitor these signals:

- **Sentry:** Alert fires when `AIError(provider=TNB)` error rate exceeds 20% over a
  5-minute window on `/api/tryon`.
- **Health endpoint:** `GET /api/admin/providers` returns `healthy: false` for TNB entry.
- **User reports:** B2B clients report try-on returning 503 or images not loading.
- **TNB status page:** https://thenewblack.ai/status (check for posted incidents)

Confirm the outage scope:

```bash
# Check provider health
curl https://your-domain.vercel.app/api/admin/providers \
  -H "x-vexa-admin-key: $VEXA_ADMIN_KEY"

# Expected healthy response:
# { "providers": [{ "name": "TNBProvider", "healthy": true, "latencyMs": 150 }] }
# Outage response:
# { "providers": [{ "name": "TNBProvider", "healthy": false, "detail": "HTTP 503" }] }

# Check error rate in Sentry or logs
# Count AIError events in last 5 minutes for provider=TNB
```

---

### Step 2 — Diagnosis

Determine if the issue is:

a) **Full TNB API outage** — all endpoints returning errors  
b) **Partial outage** — video try-on down but image try-on working (different endpoints)  
c) **Auth issue** — TNB API key expired or rate-limited  
d) **VEXA misconfiguration** — env var missing or changed

```bash
# Test TNB API directly (requires TNB API key)
curl -X POST https://thenewblack.ai/api/1.1/wf/vto_stream \
  -H "X-API-Key: $TNB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"person_image_url":"https://example.com/test.jpg","garment_image_url":"https://example.com/garment.jpg"}'

# If 401: API key issue — rotate key
# If 503/504: TNB-side outage — proceed to mitigation
# If 200: VEXA-side issue — check env vars in Vercel dashboard
```

---

### Step 3 — Mitigation

#### Option A: Register Fallback Provider (preferred)

If an alternative try-on provider is available:

1. Open `frontend/src/lib/providers/registry.ts`
2. In `initializeRegistry()`, add the fallback provider:
   ```typescript
   registerProvider('tryon', new AlternativeProvider(), 'fallback');
   ```
3. Deploy to Vercel:
   ```bash
   cd frontend
   vercel --prod
   ```
4. Verify fallback is active:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/tryon \
     -H "Content-Type: application/json" \
     -H "x-vexa-key: $TEST_API_KEY" \
     -d '{"personImageUrl":"...","garmentImageUrl":"...","category":"tops"}'
   # Response should succeed; check Sentry to confirm it used AlternativeProvider
   ```

#### Option B: Graceful Degradation (no fallback provider available)

1. Update the try-on route to return a `503` with a user-friendly message and
   `Retry-After: 900` header (15 minutes).
2. Deploy the change to Vercel.
3. Update the VEXA status page to reflect the outage.

#### Option C: Cache-Only Mode

If cache hit rate is high (> 60% during normal operations):

1. The generation cache automatically returns cached results without calling TNB.
2. New unique requests will fail — but repeat requests (same person + garment) succeed.
3. No action needed; monitor cache hit rate in Redis.

---

### Step 4 — Communication

Within 5 minutes of confirmed outage:

1. **Internal:** Post in `#incident-YYYY-MM-DD-tnb-outage`:
   > "TNB provider outage confirmed at [TIME]. Impact: image and video try-on failing.
   > Mitigation: [fallback provider / degraded mode] in progress. ETA: 15 minutes."

2. **B2B clients:** Send email or webhook notification:
   > "VEXA virtual try-on is experiencing elevated error rates due to an upstream
   > provider outage. We are working to restore service. Estimated resolution: 15 minutes.
   > Cached try-on results remain available."

3. **Status page:** Update to "Partial Outage — Virtual Try-On Degraded"

---

### Step 5 — Recovery Verification

After fallback is active or TNB reports recovery:

```bash
# 1. Verify health endpoint shows healthy
curl https://your-domain.vercel.app/api/admin/providers \
  -H "x-vexa-admin-key: $VEXA_ADMIN_KEY"

# 2. Run a live try-on test
curl -X POST https://your-domain.vercel.app/api/tryon \
  -H "Content-Type: application/json" \
  -H "x-vexa-key: $TEST_API_KEY" \
  -d '{"personImageUrl":"https://...","garmentImageUrl":"https://...","category":"tops"}'

# 3. Verify Sentry error rate drops below 1% over 5-minute window

# 4. Update status page to "All Systems Operational"
```

**RTO: 15 minutes** (with fallback provider registered and ready to deploy)  
**RTO without fallback: 30–120 minutes** (waiting for TNB recovery)

---

## Runbook 2: Redis Failure

**When to use:** Redis connection errors in application logs. Queue-based jobs stop processing.
Generation cache returning misses on all requests. Rate limiting behaving erratically.

**Impact:** Graceful degradation — the cache falls back to in-memory LRU, so image try-on
continues to work. Async jobs (video try-on, avatar, meshy) stop processing. AI costs increase
due to cache miss rate returning to 0%.

---

### Step 1 — Detection

Redis failure is **silent by design** — the cache layer falls back to in-memory LRU without
alerting. Watch for these indirect signals:

- **Cost spike:** `usage_events` table shows AI call volume higher than normal (cache misses
  mean more TNB calls being made)
- **Job queue drain:** `/api/admin/queues` shows jobs accumulating but never completing
- **Worker logs:** BullMQ workers print `connect ECONNREFUSED` or `NOAUTH Authentication required`
- **Health endpoint:**
  ```bash
  curl https://your-domain.vercel.app/api/health
  # {"status":"ok","redis":false}  <-- redis:false indicates fallback mode
  ```

---

### Step 2 — Impact Assessment

| Service | Impact | Severity |
|---------|--------|---------|
| Image try-on | Degraded — no caching, 100% AI calls | Medium |
| Video try-on | Down — jobs queue but never process | High |
| Avatar generation | Down — jobs queue but never process | High |
| 3D model generation | Down — jobs queue but never process | High |
| Rate limiting | Degraded — falls back to DB counters | Low |
| Session cache | Degraded — more Supabase round-trips | Low |

**No data loss** — Redis holds only ephemeral cache and queue state, not source-of-truth data.

---

### Step 3 — Mitigation

#### Upstash / Managed Redis

If using Upstash (recommended):
1. Log in to https://upstash.com
2. Check the database status dashboard for your Redis instance
3. If the instance is down: Upstash handles recovery automatically; wait 2–5 minutes
4. If the instance shows healthy but connections fail:
   - Rotate the Redis password in Upstash dashboard
   - Update `REDIS_URL` in Vercel environment variables
   - Redeploy: `vercel --prod`

#### Self-Hosted Redis

```bash
# On the Redis host machine:

# Check if Redis is running
systemctl status redis

# If not running, restart:
sudo systemctl restart redis

# Verify it started successfully
redis-cli ping
# Expected: PONG

# Check for RDB snapshot to restore from (if data is important):
# Redis RDB files are in /var/lib/redis/dump.rdb by default
ls -la /var/lib/redis/

# Restore from snapshot if needed (Redis does this automatically on start)
# If dump.rdb exists, Redis will load it on restart
```

---

### Step 4 — Verification

```bash
# 1. Check Redis is accepting connections
redis-cli -u $REDIS_URL ping
# Expected: PONG

# 2. Check health endpoint shows redis: true
curl https://your-domain.vercel.app/api/health
# Expected: {"status":"ok","redis":true,"timestamp":"..."}

# 3. Verify queue processing resumes
# Submit a video try-on job and check it completes within expected time
curl -X POST https://your-domain.vercel.app/api/tryon/video \
  -H "Authorization: Bearer $TEST_JWT" \
  -H "Content-Type: application/json" \
  -d '{"videoUrl":"...","productImageUrl":"...","productId":"test"}'
# Poll /api/jobs/{jobId} until status: "completed"

# 4. Check admin queue dashboard
curl https://your-domain.vercel.app/api/admin/queues \
  -H "x-vexa-admin-key: $VEXA_ADMIN_KEY"
# Verify jobs are no longer stuck in "waiting" state
```

**RTO: 10 minutes** (Upstash auto-recovery or manual Redis restart)

---

## Runbook 3: Supabase DB Failure

**When to use:** All or most API routes returning 500. Sentry shows DB connection errors
(`PostgrestError`, `AuthApiError`, or `ECONNREFUSED` to Supabase). Login stops working.

**Impact:** Complete service disruption — all persistent features require the database.

---

### Step 1 — Detection

```bash
# 1. Check health endpoint
curl https://your-domain.vercel.app/api/health
# Returns 500 or {"status":"error","db":false}

# 2. Check Supabase status page
# https://status.supabase.com — look for "Incident" or "Degraded"

# 3. Check Sentry for error pattern
# Filter by error.type = PostgrestError or error.message contains "connection refused"

# 4. Try a minimal DB query from local
# Requires supabase-js client with service role key
```

---

### Step 2 — Mitigation: Enable Read-Only Mode

While Supabase restores (or during planned maintenance), enable read-only mode to
serve cached data and reduce user impact:

1. Set `VEXA_READ_ONLY_MODE=true` in Vercel environment variables (if implemented)
   or redeploy with modified route logic that:
   - Returns cached try-on results from Redis
   - Disables write operations (no new try-ons, no key generation)
   - Returns `503 Service Temporarily Unavailable` for write endpoints with
     `Retry-After: 1800` header (30 minutes)
2. Deploy: `vercel --prod`
3. Post status update: "Database maintenance in progress. Read-only mode active.
   New try-ons temporarily unavailable."

**RTO for read-only mode: 30 minutes**

---

### Step 3 — Mitigation: Restore from Backup

#### Supabase PITR (Point-in-Time Recovery)

Available on Supabase Pro and above:

1. Log in to https://app.supabase.com
2. Navigate to your project → Database → Backups
3. Select "Point-in-Time Recovery"
4. Choose the restore point (select 5–10 minutes before the incident started)
5. Click "Restore" and confirm
6. Supabase will provision a new database instance and migrate your project to it
7. Connection strings remain the same — no env var changes needed

**Restore time: approximately 30–90 minutes depending on data size**

#### Manual Restore from Daily Backup

If PITR is not available:

1. Supabase → your project → Database → Backups → Daily Backups
2. Download the most recent backup file
3. Create a new Supabase project (same region)
4. Restore the backup via Supabase CLI:
   ```bash
   npx supabase db restore --project-ref NEW_PROJECT_REF backup.sql
   ```
5. Update `NEXT_PUBLIC_SUPABASE_URL` and service role key in Vercel
6. Redeploy: `vercel --prod`

**Restore time: approximately 2–4 hours for large databases**

---

### Step 4 — Verification

```bash
# 1. Test basic DB connectivity
curl https://your-domain.vercel.app/api/health
# Expected: {"status":"ok","db":true,"timestamp":"..."}

# 2. Test authentication flow
# Sign in via the VEXA UI and confirm JWT is issued

# 3. Test API key validation
curl https://your-domain.vercel.app/api/keys/validate \
  -H "x-vexa-key: $TEST_API_KEY"
# Expected: {"valid":true}

# 4. Test a full try-on write cycle
curl -X POST https://your-domain.vercel.app/api/tryon \
  -H "Content-Type: application/json" \
  -H "x-vexa-key: $TEST_API_KEY" \
  -d '{"personImageUrl":"...","garmentImageUrl":"...","category":"tops"}'
# Verify result is persisted: check tryon_results table in Supabase
```

**RTO: 4 hours (full restore), 30 minutes (read-only mode)**

---

## Runbook 4: R2 Storage Outage

**When to use:** Upload routes (`/api/upload`) returning 500 or slow. Try-on result images
returning 404. Logs show `NoSuchBucket` or `RequestTimeout` from S3/R2 SDK.

**Impact:** Minimal — VEXA has automatic fallback to Supabase Storage. Most functionality
continues working. Try-on results may be served from Supabase Storage URLs instead of R2 URLs.

---

### Step 1 — Detection

```bash
# 1. Check Cloudflare R2 status
# https://www.cloudflarestatus.com — check R2 status

# 2. Test upload directly
curl -X POST https://your-domain.vercel.app/api/upload \
  -H "Authorization: Bearer $TEST_JWT" \
  -F "file=@test.jpg;type=image/jpeg"
# If 500 with R2 error in logs: confirmed R2 outage
# If 200 with supabase.co URL: fallback already active

# 3. Check logs for fallback activation
# Search logs for: "[r2] upload failed, falling back to Supabase Storage"
```

---

### Step 2 — Confirm Fallback is Active

The R2 uploader (`frontend/src/lib/r2.ts`) automatically falls back to Supabase Storage
when R2 is unavailable or unconfigured. Confirm the fallback is working:

```bash
# Upload a test file and check the returned URL origin
curl -X POST https://your-domain.vercel.app/api/upload \
  -H "Authorization: Bearer $TEST_JWT" \
  -F "file=@test.jpg;type=image/jpeg"

# R2 URL: https://pub-HASH.r2.dev/...
# Supabase Storage URL: https://YOUR_PROJECT.supabase.co/storage/v1/object/public/...

# If returning Supabase Storage URL: fallback is active, no action needed
```

If the fallback URL is being returned, try-on results are stored in Supabase Storage.
They will be accessible to users. No immediate action needed beyond monitoring.

---

### Step 3 — Mitigation: Verify R2 Account Status

If the fallback is NOT activating and uploads are fully failing:

1. **Check Cloudflare account status:**
   - Log in to https://dash.cloudflare.com
   - Navigate to R2 → `vexa-assets` bucket
   - Verify the bucket exists and shows no suspension notice

2. **Verify R2 credentials are current:**
   ```bash
   # In Vercel dashboard, check these env vars:
   # R2_ACCOUNT_ID  -- Cloudflare account ID (40-character hex)
   # R2_ACCESS_KEY_ID  -- R2 API token access key
   # R2_SECRET_ACCESS_KEY  -- R2 API token secret
   # R2_ENDPOINT  -- Must be: https://ACCOUNT_ID.r2.cloudflarestorage.com
   ```

3. **Test R2 directly with AWS CLI:**
   ```bash
   AWS_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID \
   AWS_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY \
   aws s3 ls s3://vexa-assets \
     --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com \
     --region auto
   ```

4. **If credentials expired:** Regenerate R2 API token in Cloudflare dashboard (R2 →
   Manage R2 API Tokens → Create API Token), update env vars in Vercel, redeploy.

---

### Step 4 — Verification

```bash
# 1. Upload test image and verify R2 URL is returned (not Supabase fallback)
curl -X POST https://your-domain.vercel.app/api/upload \
  -H "Authorization: Bearer $TEST_JWT" \
  -F "file=@test.jpg;type=image/jpeg"
# Expected: {"url":"https://pub-HASH.r2.dev/studio/uploads/test.jpg"}

# 2. Verify the returned URL is publicly accessible
curl -I "https://pub-HASH.r2.dev/studio/uploads/test.jpg"
# Expected: HTTP/2 200

# 3. Run a full try-on cycle and verify result image is stored in R2
# Check resultUrl starts with pub-HASH.r2.dev domain
```

**RTO: 5 minutes** (fallback activates automatically; manual intervention only needed
if fallback itself is broken)

---

## General Incident Procedure

### War Room Setup

For P1 incidents (core feature down):

1. Create a Slack thread: `#incident-YYYY-MM-DD-<slug>`
2. Assign roles: Incident Commander (IC), Technical Lead, Communications Lead
3. IC posts status updates every 15 minutes until resolved
4. All diagnosis and remediation commands are posted in the thread for audit trail

### Escalation Path

| Level | Who | When |
|-------|-----|------|
| L1 | On-call engineer | First responder; runs runbook |
| L2 | Tech Lead | If L1 cannot resolve in 30 minutes |
| L3 | Vendor support | If root cause is provider-side (TNB, Supabase, Cloudflare) |

### Post-Incident

Within 24 hours of resolution:

1. Write a 5-section post-mortem: Timeline, Root Cause, Impact, Resolution, Prevention
2. Update this runbook with lessons learned
3. File tickets for any prevention work identified

---

*Emergency recovery runbooks: 2026-05-14 — VEXA v4.0*
