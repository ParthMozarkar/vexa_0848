# VEXA Backend Architecture

VEXA's backend relies entirely on Next.js Route Handlers (`/api/*`) executing in a serverless environment. This guarantees extreme horizontal scalability without the overhead of maintaining traditional monolithic container clusters.

## API Architecture Flow

```mermaid
graph TD
    Client[Web/SDK Client]
    
    subgraph "API Middleware Layer"
        RateLimit[IP Rate Limiter]
        Auth[SSO / Supabase Auth]
        MarketplaceAuth[B2B x-vexa-key Validator]
    end

    subgraph "Domain Controllers (API Routes)"
        TryOnAPI[/api/tryon]
        VideoAPI[/api/studio/video-gen]
        IntelligenceAPI[/api/fashion-intelligence]
        EnterpriseAPI[/api/enterprise]
    end

    subgraph "Core Engines"
        Orchestration[AI Orchestration Engine]
        FashionIntel[Fashion Intelligence System]
        Security[Security Engine]
    end

    Client -->|HTTPS POST/GET| RateLimit
    RateLimit --> Auth
    RateLimit --> MarketplaceAuth
    
    Auth --> TryOnAPI
    MarketplaceAuth --> TryOnAPI
    Auth --> VideoAPI
    Auth --> IntelligenceAPI
    MarketplaceAuth --> EnterpriseAPI

    TryOnAPI --> Orchestration
    VideoAPI --> Orchestration
    
    IntelligenceAPI --> FashionIntel
    EnterpriseAPI --> Security
```

## Engineering Tenets

### 1. Zero "Architecture Theater"
The backend intentionally avoids deep, enterprise-Java-style class hierarchies. Interfaces like `AIProvider` are flat and functional. If an abstraction doesn't save developer time or prevent a production outage, it is removed.

### 2. Defibrillator Pattern (Fail Fast, Recover Instantly)
AI Providers (TNB, Meshy, OpenAI) will inevitably fail. VEXA API routes wrap all external calls in strict timeout boundaries (`AbortSignal`). If an API call hangs for more than 60 seconds, the thread is forcefully killed, the error is logged to Upstash Redis metrics, and the `OrchestrationEngine` instantly tries the next provider in the registry.

### 3. Edge-Optimized Compute
We do not perform heavy compute (like image processing or video encoding) on Vercel Node.js functions. 
- Image collage creation is offloaded to the browser.
- Generative workloads are offloaded to provider APIs.
- Background tasks (like polling Meshy for 3D generation) are offloaded to BullMQ workers.

## The AIProvider Interface
Adding a new provider to VEXA takes less than 100 lines of code.

```typescript
export interface AIProvider {
  id: string;
  name: string;
  type: ProviderType;
  costPerCall: number;
  expectedLatencyMs: number;
  weight: number; 
  enabled: boolean;
  call(payload: any, options?: { timeoutMs?: number; signal?: AbortSignal }): Promise<string>;
}
```
You create a class implementing this, add it to `ProviderRegistry.ts`, and VEXA instantly begins routing traffic to it based on its weighted configuration.
