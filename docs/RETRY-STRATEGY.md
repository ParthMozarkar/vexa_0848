# VEXA Retry Strategy

## Retry Policy Per Provider

| Provider | Max Attempts | Base Delay | Max Delay | Jitter | Retry On | No Retry On |
|----------|-------------|-----------|---------|--------|---------|------------|
| TNB | 3 | 1000ms | 30000ms | yes (50–100%) | 5xx, timeout, network error | 401, 403, "invalid api key" |
| OpenAI | 3 | 1000ms | 30000ms | yes (50–100%) | 5xx, 429 rate limit, timeout | 401, 403 |
| BlackBox | 3 | 1000ms | 30000ms | yes (50–100%) | 5xx, timeout, network error | 401, 403 |

**Jitter formula:** `delay = exponential * random(0.5, 1.0)` — prevents thundering herd on provider recovery.

**Exponential sequence (no jitter):** attempt 1 = 1s, attempt 2 = 2s, attempt 3 = 4s → capped at 30s.

---

## Failover Trigger

After all retry attempts for the **primary** provider are exhausted, `callWithFailover()` automatically tries the next provider registered for that capability.

**Example — tryon capability with hypothetical fallback:**

```
Attempt 1: TNBProvider → 503 → retry
Attempt 2: TNBProvider → 503 → retry
Attempt 3: TNBProvider → 503 → RetryExhaustedError
Failover  → AlternativeProvider.call() → success ✓
```

---

## Graceful Degradation

When ALL providers for a capability are exhausted, `callWithFailover()` throws a structured error object (not an `Error` instance):

```typescript
{
  error: string;           // human-readable message
  retryAfter: number;      // suggested wait in seconds (default 60)
  fallbackAvailable: false;
  providersAttempted: string[];  // names of all providers tried
}
```

Routes should catch this and return HTTP 503:

```typescript
try {
  const result = await callWithFailover('tryon', input);
} catch (err) {
  if ('retryAfter' in (err as object)) {
    return NextResponse.json(err, { status: 503 });
  }
  throw err;
}
```

---

## Timeout Enforcement

Each provider call is wrapped with `AbortSignal.timeout(timeoutMs)` via the `ProviderCallOptions`. Timeouts are per-provider and configurable:

| Variable | Default | Provider |
|----------|---------|---------|
| `TNB_TIMEOUT_MS` | 120000 (2min) | TNBProvider |
| `OPENAI_TIMEOUT_MS` | 60000 (1min) | OpenAIProvider |
| `BLACKBOX_TIMEOUT_MS` | 120000 (2min) | BlackBoxProvider |

A timed-out call is treated as a failed attempt and triggers retry/failover.

---

## Code Locations

| Component | File |
|-----------|------|
| Retry utility (backoff, jitter, `withRetry`) | `frontend/src/lib/retry.ts` |
| Failover orchestrator (`callWithFailover`) | `frontend/src/lib/failover.ts` |
| Provider timeout config | `frontend/src/lib/providerTimeouts.ts` |
| Provider interface | `frontend/src/lib/providers/types.ts` |
| Registry | `frontend/src/lib/providers/registry.ts` |

---

*Retry strategy: 2026-05-14 — v2.0*
