# VEXA stabilization report

**Role:** production migration engineer (safe stabilization, no redesign)  
**Date:** 2026-05-13

## Summary

This pass **reconciles contracts**, **centralizes server Supabase + env policy**, **hardens health + image proxy**, **fixes try-on / IP-limit field mismatches**, **adds safe SQL migration artifacts**, **documents routes/env/db/providers**, and **adds lightweight contract tests** — without changing the core TNB try-on algorithm.

## Changed / added files (inventory)

### Documentation (`docs/`)

- `ROUTES.md` — route inventory  
- `ENVIRONMENT_MAP.md` — env inventory  
- `DB_SCHEMA_AUDIT.md` — schema audit notes  
- `PROVIDER_MAP.md` — external providers  
- `TYPECHECK_AND_ESLINT_AUDIT.md` — TS/ESLint status + phased plan  
- `STABILIZATION_REPORT.md` — (this file)

### SQL (`supabase/migrations_safe/`)

- `README.md`  
- `001_ip_usage_limits.sql`  
- `002_usage_logs_align.sql`  
- `003_tryon_results_extend.sql`  
- `004_bookings.sql`  
- `005_video_jobs_align.sql`  
- `006_increment_ip_usage.sql`  

### Frontend core

- `src/lib/env.ts` — **NEW** — production service-role requirement; dev anon fallback with warning  
- `src/lib/supabaseServer.ts` — **NEW** — single server Supabase factory  
- `src/lib/tryonContracts.ts` — **NEW** — shared try-on input/output types  
- `src/lib/safeProxyUrl.ts` — **NEW** — basic SSRF narrowing for `/api/proxy`  
- `src/lib/ipRateLimit.ts` — `generationsRemaining` alias + `maybeSingle` + server client  
- `src/lib/rateLimit.ts` — deduped RPC vs fallback increment; in-process `isRateLimited`  
- `src/lib/apiKeyMiddleware.ts` — uses server client  
- `src/lib/supabase.ts` — untyped browser client (avoids broken `Database` inference)  
- `middleware.ts` — try/catch + `monthly_limit` default + server client  

### API routes (representative)

- `src/app/api/tryon/route.ts` — typed `handleTryOn`, garment guards, `generationsRemaining` fix, contracts  
- `src/app/api/tryon/[productId]/route.ts` — body → `handleTryOn` mapping (legacy GLB field names preserved)  
- `src/app/api/tryon/batch/route.ts` — `maybeSingle`, typed batch results, server client  
- `src/app/api/health/route.ts` — optional avatar service semantics + `/health` probe  
- `src/app/api/proxy/route.ts` — URL allowlist gate  
- **All routes** previously using `SERVICE_ROLE || ANON` now call `createServerSupabaseClient()` (env policy in `env.ts`)  

### Config

- `tsconfig.json` — exclude orphan Sentry configs + legacy vitest tests from `tsc`  
- `package.json` — `vitest` devDependency + `test:contracts` script  
- `vitest.config.ts` — scope to `src/__tests__/contracts/**`  

### Tests

- `src/__tests__/contracts/tryon.contract.test.ts`  
- `src/__tests__/contracts/health.contract.test.ts`  
- `src/__tests__/contracts/keys.contract.test.ts`  

### Types

- `src/types/database.ts` — expanded to include `ip_usage_limits`, `video_jobs`, `bookings`, `monthly_limit`, nullable `usage_logs.api_key_id`, try-on extra columns  

### Backend

- `backend/main.py` — **reject** missing `INTERNAL_SERVICE_TOKEN` when environment is production-like  

## Migration safety notes

- Apply `supabase/migrations_safe/*.sql` **manually** in order after verifying prerequisites (`README` table).  
- **`002_usage_logs_align.sql`** assumes `usage_logs` and `api_keys` already exist.  
- **`006_increment_ip_usage.sql`** is optional; without it, `rateLimit.ts` logs a warning and uses row updates.

## Rollback notes

| Area | Rollback |
|------|-----------|
| Env strictness | Set `SUPABASE_SERVICE_ROLE_KEY` in prod; in dev unset triggers anon + warning (revert `env.ts` only if needed) |
| SQL | Use Supabase PITR / backup restore — forward `ADD COLUMN` is low risk but not zero |
| Middleware | Revert `middleware.ts` if API key gate causes unexpected 500s on misconfigured env |
| Proxy | If legitimate internal image URLs were required, extend `safeProxyUrl.ts` allowlist |

## Deployment checklist

- [ ] Set **`SUPABASE_SERVICE_ROLE_KEY`** on Vercel **production** (required by `env.ts`).  
- [ ] Set **`INTERNAL_SERVICE_TOKEN`** on Python host + matching value on Next for webhooks / avatar.  
- [ ] Confirm **`AVATAR_SERVICE_URL`** — if unset, health reports `avatarServiceMode: "skipped"` (not a failure).  
- [ ] Run **`npm run type-check`** in CI.  
- [ ] Run **`npm run test:contracts`** in CI.  
- [ ] Apply **`supabase/migrations_safe`** on staging → validate → production.  
- [ ] Smoke: `GET /api/health`, `POST /api/tryon` (with known good payload), `POST /api/tryon/[productId]` with Bearer token.

## Biggest intentional behavior changes (safety)

1. **Production** without service role → **throws at runtime** when creating server Supabase (by design).  
2. **Image proxy** rejects non–public-safe URLs (SSRF mitigation).  
3. **Python** rejects unauthenticated use in **production-like** env when internal token unset.  
4. **`increment_ip_usage` RPC** no longer double-increments when RPC succeeds.

## Follow-ups (not done here)

- Replace hand `database.ts` with **Supabase CLI** generated types + restore typed `createClient<Database>()`.  
- Install **Sentry** or remove config stubs.  
- Narrow **`/api/proxy`** further with explicit host allowlist env if product requires it.
