# VEXA Backup Strategy

**Version:** 1.0  
**Last Updated:** 2026-05-14  
**Owner:** Platform Engineering

---

## Overview

This document defines the backup strategy for all VEXA production data stores:
Supabase (PostgreSQL), Cloudflare R2 (object storage), and Redis (cache + queue).
Targets are aligned with the SLA commitments in `frontend/src/lib/slaMonitor.ts`.

---

## Recovery Objectives

| Metric | Target |
|--------|--------|
| RTO — API layer | 30 minutes |
| RTO — Full database restore | 4 hours |
| RPO — Redis | 1 hour |
| RPO — Database | 24 hours |
| RPO — R2 object storage | 0 (replicated, no data loss) |

---

## 1. Supabase (PostgreSQL)

### Automatic Backups (Pro Plan)

- Daily logical backups managed by Supabase infrastructure.
- Point-in-Time Recovery (PITR) available for the past **7 days** on Pro plan.
- Backups stored in Supabase-managed S3; accessible via the Supabase dashboard.

### Cold Archive via pg_dump

Scheduled nightly via cron (or CI/CD pipeline):

```bash
# Run nightly at 02:00 UTC
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-acl \
  --no-owner \
  --file="vexa-$(date +%Y%m%d).dump"

# Upload to R2 cold-archive bucket
aws s3 cp vexa-$(date +%Y%m%d).dump \
  s3://vexa-backups/postgres/$(date +%Y/%m)/ \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
```

- Retention: 90-day rolling window in the `vexa-backups` bucket.
- Cold archives are separate from the hot `vexa-assets` bucket.

### Restoration Procedure

1. Navigate to Supabase dashboard > Project > Backups.
2. Select the target restore point (PITR or daily snapshot).
3. Click "Restore" — Supabase spins up a restore job; ETA ~30-60 minutes for full restore.
4. For cold-archive restore: download `.dump` from R2, then:
   ```bash
   pg_restore --clean --if-exists \
     --dbname "$DATABASE_URL" \
     vexa-YYYYMMDD.dump
   ```

---

## 2. Cloudflare R2 (Object Storage)

### Cross-Region Replication

- The `vexa-assets` bucket has **cross-region replication** enabled for the `avatars/` prefix.
- Replication target: secondary R2 bucket in a separate geographic region.
- Content-hash deduplication (R2 ETag = MD5 of object body) prevents duplicate backup writes
  when the same asset is re-uploaded.

### Bucket Structure

```
vexa-assets/
  avatars/          — replicated; user-owned GLB/texture assets (indefinite retention)
  tryon_results/    — 90-day lifecycle rule; auto-deleted after expiry
  uploads/          — raw user photos; 90-day lifecycle rule
  designs/          — DALL-E generated design images; 365-day retention
```

### Restoration Procedure

1. If primary bucket is degraded, update `R2_BUCKET_NAME` env var to the replica bucket name.
2. Redeploy the frontend (Vercel: `vercel env pull` + `vercel deploy --prod`).
3. All asset URLs remain structurally identical — no code changes required.

---

## 3. Redis (Cache + Rate Limit Store)

### Snapshot Configuration (RDB)

```
# redis.conf
save 900 1       # save if at least 1 key changed in 900s
save 300 10      # save if at least 10 keys changed in 300s
save 60 10000    # save if at least 10000 keys changed in 60s
# Effective: RDB snapshot approximately every 15 minutes under normal load
```

### Append-Only File (AOF) for Durability

```
# redis.conf
appendonly yes
appendfsync everysec   # fsync once per second — balance of durability vs performance
```

With AOF enabled the maximum data loss on a crash is ~1 second.

### Daily Backup to R2

Scheduled nightly at 03:00 UTC:

```bash
# Trigger BGSAVE and wait for completion
redis-cli BGSAVE
sleep 5

# Copy RDB dump to R2
aws s3 cp /var/lib/redis/dump.rdb \
  s3://vexa-backups/redis/dump-$(date +%Y%m%d).rdb \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
```

- Retention: 30-day rolling window.
- RPO: 1 hour (worst case between RDB snapshots with no AOF; with AOF: ~1 second).

### Restoration Procedure

1. Stop Redis: `redis-cli SHUTDOWN NOSAVE`
2. Download the target RDB from R2.
3. Replace `/var/lib/redis/dump.rdb` with the downloaded file.
4. Start Redis: `systemctl start redis`
5. Verify key count: `redis-cli INFO keyspace`

---

## 4. Backup Verification — Monthly Restore Drill

A restore drill must be performed monthly on a staging environment:

### Drill Checklist

- [ ] Download the most recent cold-archive pg_dump from R2.
- [ ] Restore to a staging Supabase project using `pg_restore`.
- [ ] Verify row counts for key tables: `users`, `api_keys`, `tryon_results`, `audit_logs`.
- [ ] Download the most recent Redis RDB from R2.
- [ ] Restore to a staging Redis instance and verify key count matches production snapshot.
- [ ] Confirm R2 replica bucket contains all expected `avatars/` keys via:
  ```bash
  aws s3 ls s3://vexa-assets-replica/avatars/ --recursive --summarize \
    --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
  ```
- [ ] Document drill results in the monthly incident-review doc with: restore time, data completeness %, any gaps found.

### Pass Criteria

| Check | Expected |
|-------|----------|
| Database rows restored | >= 99.9% of production count |
| Redis key count | >= 95% (TTL-expired keys expected to be absent) |
| R2 avatar objects | 100% (replicated synchronously) |
| Total drill time | <= 4 hours |

---

## 5. Alert Thresholds

These thresholds should be configured in your monitoring provider (Sentry / Datadog / Uptime Robot):

| Alert | Threshold | Action |
|-------|-----------|--------|
| Supabase backup missed | > 25 hours since last backup | Page on-call |
| Redis AOF lag | > 5 minutes | Investigate replication |
| R2 replication lag | > 10 minutes | Escalate to Cloudflare support |
| Backup job failure | Exit code != 0 | Alert + retry once |

---

## References

- `frontend/src/lib/slaMonitor.ts` — SLA constants (RTO/RPO targets)
- `frontend/src/lib/compliance.ts` — Data retention policy per entity type
- [Supabase PITR docs](https://supabase.com/docs/guides/platform/backups)
- [Cloudflare R2 replication docs](https://developers.cloudflare.com/r2/buckets/bucket-replication/)
