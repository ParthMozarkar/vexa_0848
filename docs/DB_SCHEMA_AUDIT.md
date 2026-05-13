# VEXA — Database schema audit (Supabase)

## Source-of-truth strategy (post-stabilization)

1. **`supabase/migrations_safe/*.sql`** — idempotent DDL to align environments (not auto-applied).
2. **`frontend/src/types/database.ts`** — hand-maintained row shapes for documentation; server `SupabaseClient` is **untyped** until Supabase CLI codegen is adopted (`createServerSupabaseClient()`).
3. **`frontend/supabase/*.sql`** — legacy “run in SQL editor” scripts; **may drift** — treat as reference only.

## Tables (logical model)

| Table | Purpose |
|-------|---------|
| `users` | Auth-linked profile, measurements, `avatar_url` |
| `api_keys` | Marketplace API keys (hashed), `monthly_limit`, usage |
| `clothing_assets` | Meshy tasks + `glb_url` per `product_id` |
| `tryon_results` | Try-on outputs + metadata |
| `usage_logs` | Per-endpoint / per-key usage (middleware + analytics) |
| `size_charts` | Sizing reference data |
| `ip_usage_limits` | Free-tier IP limits (`tryon` / `design`) |
| `video_jobs` | Async video try-on jobs |
| `bookings` | Demo booking rows |

## Known historical drift (addressed in migrations_safe)

| Issue | Resolution |
|-------|------------|
| `ip_tryon_limits` in old types vs `ip_usage_limits` in code | Standardize on **`ip_usage_limits`** |
| `usage_logs` columns (`status` vs `status_code`, `timestamp` vs `created_at`) | Add **`status`**, **`response_time_ms`**, **`timestamp`**, nullable **`api_key_id`** |
| `tryon_results` missing `user_photo_url` / `garment_url` | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` |
| `api_keys.monthly_limit` referenced by middleware | Ensure column exists |
| `bookings` missing from types | Add table DDL |

## RLS / security

- Repo SQL snippets **do not fully define RLS**. Production must set policies separately.
- Server routes prefer **service role** in production (`env.ts`).
