# Coding Conventions

**Analysis Date:** 2026-05-13

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` — `ProductCard.tsx`, `AvatarViewer`, `TryOnOverlay`
- Lib/utility modules: camelCase `.ts` — `fitEngine.ts`, `morphEngine.ts`, `measurementUtils.ts`, `ipRateLimit.ts`
- API route handlers: always named `route.ts`, nested in directories matching the URL path — `src/app/api/tryon/route.ts`, `src/app/api/keys/generate/route.ts`
- Type definition files: `index.ts` for domain types, `database.ts` for DB-generated types — `src/types/index.ts`, `src/types/database.ts`

**Functions:**
- camelCase for all exported functions — `getFitRecommendation`, `computeMorphBlend`, `hashApiKey`, `checkIpLimit`
- Higher-order wrapper functions prefixed with `with` — `withApiKey` in `src/lib/apiKeyMiddleware.ts`
- Guard/check functions prefixed with `require` or `check` — `requireApiKey`, `checkIpLimit`, `checkRateLimit`
- Private/internal helpers (not exported) use camelCase — `getServiceSupabase`, `parseTNBResponse`, `runRequest`

**Variables:**
- camelCase throughout — `rawKey`, `hashedKey`, `marketplaceCtx`, `clientIp`
- SCREAMING_SNAKE_CASE for module-level constants — `VEXA_KEY_HEADER`, `MARKETPLACE_CTX_HEADER`, `MAX_TRYON_PER_24H`, `CM_PER_INCH`, `FETCH_TIMEOUT_MS`

**Types/Interfaces:**
- PascalCase for interfaces and type aliases — `MarketplaceContext`, `FitRecommendation`, `MorphBlend`, `RateLimitResult`
- Props interfaces named `[ComponentName]Props` — `ProductCardProps`
- Body/request shape interfaces defined locally in route files — `LoginBody`, `DesignRequest`, `VideoJobInsertRow`
- Database row types named `[Entity]Row` — `ApiKeyRow`, `UserRow`, `SizeChartRow`
- Use `type` imports when importing only types: `import type { MarketplaceContext } from '@/types'`

## Code Style

**Formatting (Prettier — `frontend/.prettierrc`):**
- Semicolons: required
- Quotes: single (`'`) for all strings
- Indent: 2 spaces
- Print width: 100 characters
- Trailing commas: `es5` (objects, arrays, function params where valid)
- Bracket same line: false (JSX closing `>` on its own line)
- Line endings: auto

**Linting (`frontend/.eslintrc.json`):**
- Extends: `next/core-web-vitals`, `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `plugin:prettier/recommended`
- Parser: `@typescript-eslint/parser`
- `@typescript-eslint/no-unused-vars`: warn — prefix with `_` to suppress (`_unused`, `_err`)
- `@typescript-eslint/no-explicit-any`: warn — avoid `any`; use typed casts or `unknown` where possible
- `no-console`: warn — only `console.warn`, `console.error`, `console.info` are allowed; `console.log` is a lint violation (though some violations exist in `src/app/api/tryon/route.ts` and `src/app/api/studio/design/route.ts`)

## Import Organization

**Order (enforced by convention, not tooling):**
1. Next.js framework imports — `import { NextRequest, NextResponse } from 'next/server'`
2. Third-party packages — `import { createClient } from '@supabase/supabase-js'`
3. Internal lib imports via `@/` alias — `import { hashApiKey } from '@/lib/crypto'`
4. Internal type imports (always `import type`) — `import type { MarketplaceContext } from '@/types'`

**Path Aliases:**
- `@/` resolves to `frontend/src/` — configured in `frontend/vitest.config.ts` and `tsconfig.json`
- All internal imports must use `@/` — never use relative paths like `../../lib/`

## Error Handling

**API Routes:**
- Wrap entire handler body in `try/catch (err: unknown)` — cast with `err instanceof Error ? err.message : String(err)`
- Return `NextResponse.json({ error: message }, { status: N })` for all error responses
- HTTP status codes used consistently:
  - `400` — bad request / missing required fields
  - `401` — unauthenticated (missing/invalid credentials or API key)
  - `404` — resource not found
  - `413` — payload too large
  - `422` — validation failure (wrong type/format)
  - `429` — rate limit exceeded
  - `500` — internal/configuration error
  - `503` — external service unavailable
- Non-fatal failures (DB persistence, R2 upload fallback) are caught locally, logged with `console.warn`, and allow the request to continue rather than failing

**Library Functions:**
- Pure functions that cannot meaningfully continue throw `Error` with descriptive messages — `l2SquaredDistance` throws on length mismatch, `morphEngine.ts`
- Functions with nullable outcomes return `null` rather than throwing — `validateApiKey` returns `null` on auth failure
- Discriminated union return pattern used for inline auth checks: `{ ctx, error: null } | { ctx: null, error: NextResponse }` — see `requireApiKey` in `src/lib/apiKeyMiddleware.ts`

**External Service Failures:**
- Catch-all `try/catch` silently returns the original value on external fetch failure — `resolveToPublicUrl`, `persistResultImage` in `src/app/api/tryon/route.ts`
- DB errors on non-critical paths are always non-fatal with `console.warn`

**Type Narrowing:**
- Always use type guards before accessing unknown-typed values: `isLoginBody` function in `src/app/api/auth/login/route.ts`
- Cast via `e instanceof Error ? e.message : String(e)` — never assume error type

## Logging

**Allowed calls:** `console.warn`, `console.error`, `console.info` only (`no-console` rule)

**Pattern — prefixed with route or module name:**
```typescript
console.error('[/api/tryon] ERROR:', message);
console.warn('[/api/upload] R2 unavailable — serving base64 avatar inline');
console.error('[TNB Error] Status:', res.status);
console.error('[RateLimit] DB Error:', error);
```

**Security rule:** Never log raw API key values — enforced by JSDoc comment in `src/lib/apiKeyMiddleware.ts`: `// never log this`

## Comments

**File-level JSDoc:**
Every lib module and API route starts with a block comment describing its purpose, auth model, and key rules:
```typescript
/**
 * apiKeyMiddleware.ts
 * Validates x-vexa-key header and attaches marketplace context to request.
 * RULE: no raw API keys in logs, no `any` types.
 */
```

**Section separators:**
Used in longer files to organize blocks:
```typescript
// ─── Unit Conversion ─────────────────────────────────────────────────────────
// ─── Validation ──────────────────────────────────────────────────────────────
```

**Inline comments:**
Short imperative notes on non-obvious logic:
```typescript
// Negate so closer archetypes get larger exponential value
// PGRST116 is "not found"
// never log this
```

**TSDoc on exported functions:**
Used for public lib functions — `@param`, `@returns`, plain description:
```typescript
/**
 * Softmax over negative distances (closer = higher weight).
 * Temperature τ controls sharpness; lower → winner-takes-all.
 */
export function softmaxWeights(distances: number[], temperature: number = 1.0): number[]
```

## Function Design

**Size:** Functions are kept focused — typically 10–40 lines. Long handlers are broken into named helper functions (`authenticateRequest`, `resolveToPublicUrl`, `persistResultImage`, `callTNB` in `src/app/api/tryon/route.ts`).

**Parameters:** Prefer object destructuring for 3+ parameters — `handleTryOn({ userId, productId, userPhotoUrl, ... }, supabase)`. Single typed parameters for simple utilities.

**Default Parameters:** Use TypeScript default param syntax — `k: number = 3`, `temperature: number = 1.0`, `type: 'tryon' | 'design' = 'tryon'`.

**Return Values:**
- Always explicitly type async functions returning `NextResponse` — `async function POST(req: NextRequest): Promise<NextResponse>`
- Return `null` for "not found" / unauthorized outcomes in lib functions
- Avoid returning `undefined` — use `null` as the explicit empty signal

## Module Design

**Exports:**
- Named exports only in lib modules — no default exports
- API route handlers use named HTTP verb exports (`export async function POST`, `export async function GET`) per Next.js App Router convention
- React components use default exports — `export default function ProductCard`

**Barrel Files:**
- `src/types/index.ts` acts as the barrel for all shared domain types
- `src/lib/` modules are NOT barrel-exported — import each module directly: `import { hashApiKey } from '@/lib/crypto'`

## Security Conventions (from `src/lib/apiKeyMiddleware.ts`)

- Raw API keys are never stored in the DB — only SHA-256 hashes via `hashApiKey` in `src/lib/crypto.ts`
- Raw keys are never logged — enforced by code comment
- Dev bypass keys come from environment variables only (`DEV_API_KEY`, `INTERNAL_ONBOARDING_KEY`) — never hardcoded
- Measurement data is PII — no `console.log` of measurement values (stated in `src/lib/measurementUtils.ts` header comment)

---

*Convention analysis: 2026-05-13*
