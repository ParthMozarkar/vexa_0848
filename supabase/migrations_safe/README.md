# Safe migrations (manual apply)

These files are **idempotent** `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` statements intended to **reconcile drift** between environments.

**Do not run automatically from this repository.** Apply in order on a **staging** database first, then production, after backup.

| Order | File | Purpose |
|-------|------|---------|
| 0 | (manual) | Ensure `api_keys` and baseline `usage_logs` / `tryon_results` exist (see `frontend/supabase/*.sql`) |
| 1 | `001_ip_usage_limits.sql` | IP free-tier limits table |
| 2 | `002_usage_logs_align.sql` | Align `usage_logs` with middleware + analytics |
| 3 | `003_tryon_results_extend.sql` | Optional columns for persistence |
| 4 | `004_bookings.sql` | Bookings table for `/api/bookings` |
| 5 | `005_video_jobs_align.sql` | Ensure `video_jobs` columns |
| 6 | `006_increment_ip_usage.sql` | Optional RPC for `rateLimit.ts` |

Rollback: restore from Supabase backup / PITR — forward DDL cannot be fully reversed without manual `DROP COLUMN` planning.
