# TypeScript & ESLint audit (gradual enforcement)

**Date:** 2026-05-13  
**Scope:** `frontend/`

## TypeScript (`tsc --noEmit`)

| Item | Status |
|------|--------|
| **Exit code** | **0** (after stabilization) |
| **Strict** | `strict: true` in `tsconfig.json` |
| **Excluded from `tsc`** | `sentry.*.config.ts` (missing `@sentry/nextjs`), `vitest.config.ts`, `src/lib/__tests__/**` (legacy tests) |
| **Supabase typing** | Server uses **untyped** `SupabaseClient` via `createServerSupabaseClient()` until Supabase CLI types replace hand schema |

### Categories of historical issues (resolved vs deferred)

1. **Resolved:** `SupabaseClient<Database>` inferred `never` for many tables — mitigated by **loosening server client typing** while keeping `database.ts` as documentation.
2. **Deferred:** Install `@sentry/nextjs` **or** delete orphan `sentry.*.config.ts` files.
3. **Deferred:** Align `src/lib/__tests__/*` with Vitest or migrate to `src/__tests__/contracts/`.

## ESLint (`next lint`)

**Sample (non-zero):** rules hit include `@typescript-eslint/no-explicit-any`, `@next/next/no-html-link-for-pages`, `jsx-a11y/alt-text`, `prefer-const`, `react/no-unescaped-entities`.

### Gradual enforcement strategy (do not flip builds yet)

1. **Phase A — CI informational:** run `npm run type-check` + `npm run lint` with `continue-on-error: true` (or equivalent) and publish reports as artifacts.
2. **Phase B — API-only strictness:** enable `--max-warnings 0` only for `src/app/api/**` once `any` clean there.
3. **Phase C — UI:** fix `no-html-link-for-pages` and a11y warnings route-by-route.
4. **Phase D — production builds:** set `typescript.ignoreBuildErrors: false` and `eslint.ignoreDuringBuilds: false` in `next.config.mjs` **only after** Phases A–C green.

`next.config.mjs` currently ignores TS/ESLint during production builds — **unchanged** per stabilization scope.
