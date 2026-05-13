# VEXA Rollback Strategy

**Document Date:** 2026-05-13
**Audience:** Engineers and on-call operators responding to production incidents
**System:** Next.js 15 frontend on Vercel + Python FastAPI backend + Supabase PostgreSQL + Cloudflare R2

---

## Rollback Decision Criteria

Use this decision tree when a production issue is detected:

```
Is production impacted right now?
│
├── NO → Schedule a fix in the next sprint. No rollback needed.
│
└── YES → Can the issue be fixed with a one-line config change or env var update?
          │
          ├── YES → Apply hotfix via Vercel env var update or redeploy.
          │         (Faster than rollback; no data risk)
          │
          └── NO → Is data being corrupted or user data leaking?
                    │
                    ├── YES → ROLLBACK IMMEDIATELY. Follow per-component procedures below.
                    │         After rollback: file incident report.
                    │
                    └── NO → Is the broken feature a core revenue path?
                              (try-on, upload, auth, key generation)
                              │
                              ├── YES → ROLLBACK within 15 minutes.
                              │
                              └── NO → Can it be feature-flagged off?
                                        │
                                        ├── YES → Disable feature. Schedule hotfix.
                                        │
                                        └── NO → ROLLBACK. Schedule hotfix.
```

### When to Hotfix Instead of Rollback

- The fix is a single environment variable change
- The fix is a 1–5 line code change with no schema impact
- The rollback itself would cause data loss or migration conflict
- The fix can be deployed and verified in under 30 minutes

### When to Always Rollback

- Auth bypass has been reintroduced (any user gets valid responses without credentials)
- Production data is being written to wrong user accounts
- API keys or secrets are being logged or exposed in responses
- The previous deployment was the last known-good state

---

## Per-Component Rollback Procedures

### Frontend (Vercel) — Instant Rollback

Vercel retains every deployment permanently. Rolling back takes under 60 seconds with zero
downtime.

**Via Vercel Dashboard (preferred):**

1. Go to https://vercel.com/dashboard
2. Select the VEXA project
3. Click "Deployments" in the left sidebar
4. Find the last known-good deployment (look at the deployment list; each has a timestamp
   and the git commit message)
5. Click the three-dot `...` menu next to that deployment
6. Click **"Promote to Production"**
7. Confirm the dialog
8. Production traffic immediately routes to the previous deployment

**Via Vercel CLI:**

```bash
# List recent deployments
vercel ls --prod

# Inspect a specific deployment
vercel inspect https://vexa-HASH.vercel.app

# Promote a previous deployment to production
vercel promote https://vexa-HASH.vercel.app --prod
```

**Verify rollback success:**

```bash
curl -I https://your-domain.vercel.app/api/health
# Check the x-vercel-deployment-url header to confirm the correct deployment is live
```

---

### Backend (Python Avatar Service)

Rollback strategy depends on deployment method.

#### Docker Rollback

Before every deployment, tag the current image as a rollback target:

```bash
# Before deploying new version (run this FIRST):
docker tag vexa-backend:latest vexa-backend:rollback

# Deploy new version
docker build -t vexa-backend:latest .
docker stop vexa-backend
docker run -d --name vexa-backend -p 8000:8000 --env-file .env vexa-backend:latest

# === If new version is broken ===
docker stop vexa-backend
docker run -d --name vexa-backend -p 8000:8000 --env-file .env vexa-backend:rollback

# Verify
curl http://localhost:8000/health
```

**Using image tags for multi-version management:**

```bash
# Tag images with git commit hash for traceability
GIT_HASH=$(git rev-parse --short HEAD)
docker build -t vexa-backend:${GIT_HASH} -t vexa-backend:latest .

# Rollback to specific version
docker stop vexa-backend
docker run -d --name vexa-backend -p 8000:8000 --env-file .env vexa-backend:${PREVIOUS_HASH}
```

#### Railway Rollback

1. Go to your Railway project → the backend service
2. Click "Deployments" tab
3. Find the previous deployment
4. Click the three-dot menu → **"Redeploy"**
5. Railway will redeploy that exact commit

#### Fly.io Rollback

```bash
# List releases
flyctl releases list --app vexa-backend

# Rollback to a specific release number
flyctl deploy --image registry.fly.io/vexa-backend:deployment-01ABCD

# OR use the Fly.io dashboard:
# fly.io/apps/vexa-backend → Releases → click previous release → "Rollback"
```

---

### Database (Supabase) Migration Rollback

**Important:** Supabase (PostgreSQL) does not support automatic migration rollback. Schema
changes must be manually reversed. This is why **all migrations must include a corresponding
down migration**.

#### Before Applying a Migration

Always create a backup before running schema changes in production:

```bash
# Using Supabase CLI — export current schema
npx supabase db dump --schema public > backup-$(date +%Y%m%d-%H%M%S).sql

# Store backup offsite (S3, local machine, etc.) before running migration
```

#### Rolling Back a Schema Migration

If a migration was applied and needs to be reversed:

```bash
# Connect to your Supabase database
npx supabase db connect --project-ref YOUR_PROJECT_REF

# In the SQL editor, run the reverse migration
# Example: if migration added a column, drop it
ALTER TABLE tryon_results DROP COLUMN IF EXISTS heatmap_url;

# If migration added a table, drop it
DROP TABLE IF EXISTS new_feature_table;

# If migration added an index
DROP INDEX IF EXISTS idx_tryon_results_new_column;
```

**For Supabase-managed migrations:**

```bash
# View migration history
npx supabase migration list

# There is no built-in "down" command — write reversal SQL manually
# Open frontend/supabase/ directory for migration files and their context
```

#### Row-Level Data Rollback

If a code bug wrote bad data to rows (not schema changes), use point-in-time recovery:

1. Supabase Dashboard → Project Settings → Database → Backups
2. Point-in-time recovery is available on Pro plan and above
3. For free tier: use the most recent automatic daily backup
4. **Warning:** Point-in-time recovery replaces the entire database. Coordinate with the team
   to avoid concurrent data loss.

---

### Asset Storage (Cloudflare R2)

R2 does not have built-in versioning. Prevention is better than recovery.

**Key facts:**
- Try-on result images are written once and never overwritten (UUID-keyed paths)
- Avatar GLB files are written once per user per generation
- Design result images are written once
- There is no scenario where a code deployment would delete or corrupt existing R2 objects

**If R2 objects are accidentally deleted:**

There is no recovery unless you have a separate backup. Implement R2 bucket replication for
critical object types:

```bash
# Enable R2 bucket replication to a second bucket (via Cloudflare dashboard)
# R2 → vexa-assets → Settings → Object Replication → Add rule
```

---

## Data Rollback Considerations

### `tryon_results` Table

- Rows are upserted on every try-on call (keyed by `user_id` + `product_id` or a UUID)
- A code bug that writes wrong `user_id` values could associate results with wrong accounts
- If this occurs: write a targeted `UPDATE` to reassign rows, or `DELETE` affected rows
  Do NOT restore the entire database — use surgical SQL corrections

### `users` Table

- The `avatar_url` column is updated by the webhook at `/api/webhook/avatar-ready`
- A bad webhook (wrong `userId`) could overwrite another user's `avatar_url`
- If this occurs: export affected rows before rollback, fix via SQL `UPDATE`

### `api_keys` Table

- Keys are hashed; raw keys are never stored
- Revocation sets `is_active = false`; it does not delete rows
- If keys were accidentally revoked: set `is_active = true` via Supabase SQL editor
- If keys were accidentally created: revoke via `POST /api/keys/revoke`

### `ip_usage_limits` Table

- Rate limit counters; cleared automatically by the cleanup job
- A bad deploy could corrupt counters (allow over-limit or block everyone)
- Reset: `DELETE FROM ip_usage_limits;` — counters reset to zero; all IPs get fresh limits

---

## Communication Template for Incident Response

Use this template when communicating a production incident to stakeholders:

---

**Subject:** [SEVERITY] Production Incident — VEXA [Component] — [Short Description]

**Status:** Investigating / Mitigating / Resolved

**Time detected:** YYYY-MM-DD HH:MM UTC

**Impact:**
- What users are affected: [all users | B2B marketplace clients | admin users]
- What is broken: [describe the broken behavior]
- What still works: [list features confirmed working]

**Root cause:** [Known / Under investigation]

**Timeline:**
- HH:MM UTC — Incident detected via [monitoring / user report]
- HH:MM UTC — Engineering engaged
- HH:MM UTC — Root cause identified: [description]
- HH:MM UTC — Rollback initiated / Hotfix deployed
- HH:MM UTC — Incident resolved

**Actions taken:**
- [Describe rollback or hotfix]
- [Env var changed / code deployed]

**Next steps:**
- [ ] Post-mortem scheduled for [date]
- [ ] Regression test added to prevent recurrence
- [ ] Affected users notified (if personal data was involved)

---

## Rollback Runbook — Quick Reference

| Component | Rollback Speed | Method | Data Risk |
|-----------|---------------|--------|-----------|
| Frontend (Vercel) | < 60 seconds | Vercel Dashboard "Promote to Production" | None |
| Backend (Docker) | 2–5 minutes | `docker run vexa-backend:rollback` | None |
| Backend (Railway) | 2–5 minutes | Railway dashboard "Redeploy" | None |
| Backend (Fly.io) | 2–5 minutes | `flyctl deploy --image` previous release | None |
| DB schema (migration) | 5–30 minutes | Manual reverse SQL | Moderate — test on staging first |
| DB row data | 5–60 minutes | Point-in-time recovery (Pro) or manual SQL | HIGH — coordinate team |
| R2 assets | N/A — no rollback | Prevention only (bucket replication) | HIGH if no replication |

---

*Rollback strategy: 2026-05-13 | Phase 8 documentation pass*
