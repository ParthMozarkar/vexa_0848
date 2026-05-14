# VEXA Provider Integration Guide

**Document Date:** 2026-05-14
**Version:** 1.0
**Audience:** Engineers adding new AI provider integrations to VEXA

---

## Table of Contents

1. [Overview](#1-overview)
2. [Step 1 — Implement the AIProvider Interface](#2-step-1--implement-the-aiprovider-interface)
3. [Step 2 — Register in the Provider Registry](#3-step-2--register-in-the-provider-registry)
4. [Step 3 — Add Cost Estimate](#4-step-3--add-cost-estimate)
5. [Step 4 — Add Timeout Configuration](#5-step-4--add-timeout-configuration)
6. [Step 5 — Add Worker Handler (Async Providers)](#6-step-5--add-worker-handler-async-providers)
7. [Step 6 — Export from Index](#7-step-6--export-from-index)
8. [Step 7 — Update PROVIDER-MAP.md](#8-step-7--update-provider-mapmd)
9. [Test Checklist](#9-test-checklist)
10. [Health Check Guidance](#10-health-check-guidance)

---

## 1. Overview

VEXA uses a provider registry pattern (`registry.ts`) that decouples AI provider
implementations from route handlers. Adding a new provider requires zero changes
to existing route files — the failover system automatically tries new providers
when the primary fails.

### Capability System

Each provider declares which "capabilities" it can handle. The registry maps
capabilities to ordered provider lists (primary, then fallbacks):

| Capability | Currently Handled By | Queue? |
|-----------|---------------------|--------|
| `tryon` | TNBProvider | No (synchronous) |
| `tryon-video` | TNBProvider (worker) | Yes (`tryon-video` queue) |
| `design` | OpenAIProvider | No (synchronous) |
| `trends` | OpenAIProvider | No (synchronous) |
| `model-gen` | BlackBoxProvider (worker) | Yes (`meshy-gen` queue) |

To add a provider as fallback for `tryon`, declare `capabilities: ['tryon']` and
register it as `'fallback'`.

---

## 2. Step 1 — Implement the AIProvider Interface

Create a new file at `frontend/src/lib/providers/myProvider.ts`.

### Interface Contract

```typescript
// frontend/src/lib/providers/types.ts (existing — do not modify)
export interface AIProvider<TInput, TOutput> {
  readonly name: string;
  readonly capabilities: ProviderCapability[];
  call(input: TInput, options?: ProviderCallOptions): Promise<TOutput>;
  healthCheck(): Promise<ProviderHealthResult>;
}

export type ProviderCapability = 'tryon' | 'tryon-video' | 'design' | 'trends' | 'model-gen';

export interface ProviderCallOptions {
  signal?: AbortSignal;
  timeout?: number;
}

export interface ProviderHealthResult {
  healthy: boolean;
  latencyMs: number;
  detail?: string;
}
```

### Template: Synchronous Provider

Use this template for providers that return results directly (no background queue):

```typescript
// frontend/src/lib/providers/myProvider.ts
import type {
  AIProvider,
  ProviderCapability,
  ProviderCallOptions,
  ProviderHealthResult,
} from './types';

// Define your input/output shapes
export interface MyProviderInput {
  personImageUrl: string;
  garmentImageUrl: string;
  category: string;
}

export type MyProviderOutput = string; // e.g., result image URL

const MY_PROVIDER_API_URL = 'https://api.myprovider.com/v1/tryon';

export class MyProvider implements AIProvider<MyProviderInput, MyProviderOutput> {
  readonly name = 'MyProvider';
  readonly capabilities: ProviderCapability[] = ['tryon'];

  async call(input: MyProviderInput, options?: ProviderCallOptions): Promise<MyProviderOutput> {
    const apiKey = process.env.MY_PROVIDER_API_KEY;
    if (!apiKey) {
      throw new Error('MY_PROVIDER_API_KEY is not set');
    }

    const signal = options?.signal ??
      AbortSignal.timeout(options?.timeout ?? 60_000);

    const response = await fetch(MY_PROVIDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        person_image: input.personImageUrl,
        garment_image: input.garmentImageUrl,
        category: input.category,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `MyProvider error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json() as { result_url: string };
    if (!data.result_url) {
      throw new Error('MyProvider: response missing result_url');
    }

    return data.result_url;
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const start = Date.now();
    try {
      const apiKey = process.env.MY_PROVIDER_API_KEY;
      if (!apiKey) {
        return { healthy: false, latencyMs: 0, detail: 'API key not configured' };
      }
      // Use a lightweight endpoint (e.g., account info or status page)
      const response = await fetch('https://api.myprovider.com/v1/status', {
        headers: { 'X-API-Key': apiKey },
        signal: AbortSignal.timeout(5_000),
      });
      return {
        healthy: response.ok,
        latencyMs: Date.now() - start,
        detail: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
```

### Template: Async Provider (Queue-Based)

For providers that return job IDs and require polling, implement the async pattern:

```typescript
// frontend/src/lib/providers/myAsyncProvider.ts
import type { AIProvider, ProviderCapability, ProviderHealthResult } from './types';

export interface MyAsyncInput {
  videoUrl: string;
  garmentImageUrl: string;
}

export interface MyAsyncOutput {
  jobId: string;
  pollUrl: string;
}

export class MyAsyncProvider implements AIProvider<MyAsyncInput, MyAsyncOutput> {
  readonly name = 'MyAsyncProvider';
  readonly capabilities: ProviderCapability[] = ['tryon-video'];

  async call(input: MyAsyncInput): Promise<MyAsyncOutput> {
    const apiKey = process.env.MY_ASYNC_API_KEY;
    if (!apiKey) throw new Error('MY_ASYNC_API_KEY is not set');

    const response = await fetch('https://api.myprovider.com/v1/video-tryon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ video_url: input.videoUrl, garment_url: input.garmentImageUrl }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) throw new Error(`MyAsyncProvider: ${response.status}`);
    const data = await response.json() as { job_id: string; poll_url: string };
    return { jobId: data.job_id, pollUrl: data.poll_url };
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const start = Date.now();
    return { healthy: true, latencyMs: Date.now() - start };
  }
}
```

---

## 3. Step 2 — Register in the Provider Registry

Open `frontend/src/lib/providers/registry.ts` and add your provider inside the
`initializeRegistry()` function.

```typescript
// frontend/src/lib/providers/registry.ts (existing file — add to initializeRegistry())
import { MyProvider } from './myProvider';

export function initializeRegistry(): void {
  // ... existing registrations ...

  // Register as primary for a new capability:
  registerProvider('tryon', new MyProvider(), 'primary');

  // OR register as fallback (tried when primary exhausts retries):
  registerProvider('tryon', new MyProvider(), 'fallback');
}
```

### Registration Positions

| Position | Behavior |
|----------|---------|
| `'primary'` | Called first for the capability; existing primary becomes first fallback |
| `'fallback'` | Called only when all higher-priority providers fail |

The failover system in `callWithFailover()` tries providers in order until one succeeds.
Zero changes to route files are needed.

---

## 4. Step 3 — Add Cost Estimate

Open `frontend/src/lib/costTracker.ts` and add an entry to `PROVIDER_COSTS_USD`:

```typescript
// frontend/src/lib/costTracker.ts
export const PROVIDER_COSTS_USD: Record<string, number> = {
  TNB: 0.05,
  OpenAI_image: 0.04,
  OpenAI_text: 0.01,
  BlackBox: 0.02,
  MyProvider: 0.03,   // <-- add your provider's estimated cost per call in USD
};
```

This value is used by `trackProviderCall()` to log cost events to `usage_events` for
billing and cost forecasting. Use the vendor's published pricing or your empirical average.

---

## 5. Step 4 — Add Timeout Configuration

Open `frontend/src/lib/providerTimeouts.ts` and add an entry:

```typescript
// frontend/src/lib/providerTimeouts.ts
export const PROVIDER_TIMEOUTS: Record<string, number> = {
  TNB: parseInt(process.env.TNB_TIMEOUT_MS ?? '120000'),
  OPENAI: parseInt(process.env.OPENAI_TIMEOUT_MS ?? '60000'),
  BLACKBOX: parseInt(process.env.BLACKBOX_TIMEOUT_MS ?? '120000'),
  MY_PROVIDER: parseInt(process.env.MY_PROVIDER_TIMEOUT_MS ?? '60000'), // <-- add this
};
```

Add the corresponding environment variable to `frontend/.env.local.example`:

```bash
# My Provider timeout (default: 60000ms = 60s)
MY_PROVIDER_TIMEOUT_MS=60000
```

Pass the timeout to the provider call via `ProviderCallOptions`:

```typescript
const result = await callWithFailover('tryon', input, {
  timeout: PROVIDER_TIMEOUTS.MY_PROVIDER,
});
```

---

## 6. Step 5 — Add Worker Handler (Async Providers)

If your provider is queue-based (jobs that run in the background), add a handler
in the BullMQ worker file.

Open `frontend/src/workers/aiWorker.ts` and add a handler for your queue:

```typescript
// frontend/src/workers/aiWorker.ts (existing file — add new worker)
import { Worker } from 'bullmq';
import { MyAsyncProvider } from '@/lib/providers/myAsyncProvider';
import { redisConnection } from '@/lib/redis';

const myProvider = new MyAsyncProvider();

// Add to the worker initialization section:
const myProviderWorker = new Worker(
  'my-provider-queue',
  async (job) => {
    const { userId, videoUrl, garmentImageUrl } = job.data as {
      userId: string;
      videoUrl: string;
      garmentImageUrl: string;
    };

    const result = await myProvider.call({ videoUrl, garmentImageUrl });

    // Poll for completion (provider-specific polling logic)
    const finalResult = await pollUntilReady(result.pollUrl);

    return { resultUrl: finalResult, userId, status: 'ready' };
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY_MY_PROVIDER ?? '2'),
  }
);

myProviderWorker.on('failed', (job, err) => {
  console.error(`[myProviderWorker] Job ${job?.id} failed:`, err.message);
});
```

Add the queue definition in `frontend/src/lib/queues.ts`:

```typescript
export const MY_PROVIDER_QUEUE = 'my-provider-queue';
```

---

## 7. Step 6 — Export from Index

Open `frontend/src/lib/providers/index.ts` and add your export:

```typescript
// frontend/src/lib/providers/index.ts
export { TNBProvider } from './tnbProvider';
export { OpenAIProvider } from './openAIProvider';
export { BlackBoxProvider } from './blackBoxProvider';
export { MyProvider } from './myProvider';          // <-- add this
export { MyAsyncProvider } from './myAsyncProvider'; // <-- and this if async
```

---

## 8. Step 7 — Update PROVIDER-MAP.md

Add a row to the Registered Providers table in `docs/PROVIDER-MAP.md`:

```markdown
| MyProvider | `MyProvider` | `tryon` | Image try-on (fallback) | TNB | $0.03 | `MY_PROVIDER_API_KEY` | 60s (`MY_PROVIDER_TIMEOUT_MS`) | `GET /v1/status` |
```

And update the Fallback Chains section:

```markdown
tryon capability:
  1. TNBProvider
  2. MyProvider   <-- add here
```

---

## 9. Test Checklist

Before merging a new provider integration, verify the following:

### Unit Tests

- [ ] `myProvider.test.ts` exists in `frontend/src/lib/__tests__/`
- [ ] Test covers: successful response parsing, non-2xx error throwing, missing API key error
- [ ] Test mocks `fetch` — does not make real network calls
- [ ] Test covers `healthCheck()` returning `{ healthy: true }` and `{ healthy: false }`

### Integration Smoke Tests

Run against a real API key in a development environment:

```bash
# 1. Direct provider call test
npx ts-node -e "
  const { MyProvider } = require('./src/lib/providers/myProvider');
  const p = new MyProvider();
  p.healthCheck().then(r => console.log('Health:', r));
  p.call({ personImageUrl: 'https://...', garmentImageUrl: 'https://...', category: 'tops' })
    .then(url => console.log('Result:', url))
    .catch(err => console.error('Error:', err.message));
"

# 2. Via admin health endpoint (after registering in registry.ts)
curl http://localhost:4028/api/admin/providers \
  -H "x-vexa-admin-key: $VEXA_ADMIN_KEY"
# Verify MyProvider appears in the response with healthy: true/false
```

### Failover Test

```bash
# Temporarily break the primary provider (e.g., set TNB_API_KEY=invalid)
# Then make a /api/tryon request and verify it falls through to MyProvider
curl -X POST http://localhost:4028/api/tryon \
  -H "Content-Type: application/json" \
  -d '{ "personImageUrl": "...", "garmentImageUrl": "...", "category": "tops" }'
# Sentry/logs should show: "TNBProvider failed, trying MyProvider"
```

### Cost Tracking Test

After a successful call, verify cost was logged:

```sql
-- In Supabase SQL editor
SELECT * FROM usage_events
WHERE provider = 'MyProvider'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 10. Health Check Guidance

Health checks are called by `GET /api/admin/providers` to surface provider status to
operators. Design your `healthCheck()` to:

1. **Probe a lightweight endpoint** — avoid triggering billable operations (do not call the
   inference API itself; use a `/status`, `/v1/models`, or `/ping` endpoint if available).
2. **Timeout aggressively** — use `AbortSignal.timeout(5_000)` (5 seconds). Health checks
   run in parallel; a slow one blocks the admin dashboard.
3. **Return structured detail** — include `detail: "HTTP 503 Service Unavailable"` so
   operators can see the failure reason without reading raw logs.
4. **Never throw** — always return a `ProviderHealthResult`. Unhandled exceptions in
   `healthCheck()` will cause the admin endpoint to return 500 instead of a degraded status.

### Health Check Response Format

```typescript
// Healthy
{ healthy: true, latencyMs: 42 }

// Degraded (returns response but slow)
{ healthy: true, latencyMs: 3800, detail: 'High latency — check provider status page' }

// Unhealthy
{ healthy: false, latencyMs: 0, detail: 'API key not configured' }
{ healthy: false, latencyMs: 120, detail: 'HTTP 503 Service Unavailable' }
{ healthy: false, latencyMs: 5000, detail: 'Timeout after 5000ms' }
```

---

*Provider integration guide: 2026-05-14 — VEXA v4.0*
