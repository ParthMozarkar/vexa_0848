# VEXA Provider Map

## Registered Providers

| Provider | Class | Capabilities | Primary For | Fallback For | Est. Cost/Call | Config Key | Timeout | Health Check |
|----------|-------|-------------|-------------|--------------|---------------|-----------|---------|-------------|
| TNB | `TNBProvider` | `tryon`, `tryon-video` | Image try-on, video try-on | — | $0.05 | `TNB_API_KEY` | 120s (`TNB_TIMEOUT_MS`) | None (returns healthy) |
| OpenAI | `OpenAIProvider` | `design`, `trends` | Design image gen, trend text | — | $0.04/image, $0.01/text | `OPENAI_API_KEY` | 60s (`OPENAI_TIMEOUT_MS`) | `GET /v1/models` |
| BlackBox | `BlackBoxProvider` | `model-gen` | AI model photo generation | — | $0.02 | `BLACKBOX_API_KEY` | 120s (`BLACKBOX_TIMEOUT_MS`) | None (returns healthy) |

---

## Fallback Chains

```
tryon capability:
  1. TNBProvider  →  [no fallback configured]

design capability:
  1. OpenAIProvider  →  [no fallback configured]

trends capability:
  1. OpenAIProvider  →  [no fallback configured]

model-gen capability:
  1. BlackBoxProvider  →  [no fallback configured]
```

To add a fallback, call `registerProvider('tryon', new AlternativeProvider(), 'fallback')` in `registry.ts`.

---

## Adding a New Provider

1. Create `frontend/src/lib/providers/myProvider.ts` implementing the `AIProvider<TInput, TOutput>` interface:

```typescript
import type { AIProvider, ProviderCapability, ProviderCallOptions, ProviderHealthResult } from './types';

export class MyProvider implements AIProvider<MyInput, MyOutput> {
  readonly name = 'MyProvider';
  readonly capabilities: ProviderCapability[] = ['tryon'];

  async call(input: MyInput, options?: ProviderCallOptions): Promise<MyOutput> {
    // implementation
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    // probe or return { healthy: true, latencyMs: 0 }
  }
}
```

2. Register in `frontend/src/lib/providers/registry.ts` inside `initializeRegistry()`:

```typescript
registerProvider('tryon', new MyProvider(), 'fallback'); // or 'primary'
```

3. Export from `frontend/src/lib/providers/index.ts`.

**Zero route file changes required.** The failover system automatically tries the new provider if the primary exhausts retries.

---

## Provider Input/Output Contracts

### TNBProvider
- **Input:** `{ personImageUrl: string; garmentImageUrl: string; category: TryOnCategory }`
- **Output:** `string` (result image URL)
- **Endpoint:** `https://thenewblack.ai/api/1.1/wf/vto_stream` (or `vto-shoes` for shoes)
- **Auth:** `X-API-Key: <TNB_API_KEY>` header

### OpenAIProvider
- **Input:** `{ type: 'image' | 'text'; prompt: string; model?: string }`
- **Output:** `{ url?: string; text?: string }`
- **Endpoints:** DALL-E 3 for images, GPT-4o-mini for text
- **Auth:** OpenAI SDK (reads `OPENAI_API_KEY` from env)

### BlackBoxProvider
- **Input:** `{ garmentImageUrl: string; modelGender?: 'male' | 'female' }`
- **Output:** `{ modelImageUrl: string }`
- **Endpoint:** `https://api.blackbox.ai/api/v1/model-gen`
- **Auth:** `Authorization: Bearer <BLACKBOX_API_KEY>` header

---

*Provider map: 2026-05-14 — v2.0*
