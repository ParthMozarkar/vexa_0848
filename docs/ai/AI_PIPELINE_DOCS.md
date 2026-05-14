# AI Orchestration Pipeline

The VEXA AI Orchestration Pipeline is designed to abstract away the fragility of generative AI providers, ensuring high availability, optimal latency, and cost-efficiency.

## 1. Request Flow & Provider Routing

The following sequence diagram illustrates how a user request flows through the orchestration engine, including fallback and metric updates.

```mermaid
sequenceDiagram
    actor User
    participant API as /api/tryon
    participant DB as Supabase DB
    participant Orch as OrchestrationEngine
    participant Router as SmartRouter
    participant Redis as Upstash Redis
    participant TNB as Provider (TNB)
    participant Storage as R2 / Storage

    User->>API: POST /api/tryon (Image URLs)
    API->>API: Validate Inputs & Auth
    API->>Storage: Resolve & Upload Inputs to Public CDN
    Storage-->>API: Public URLs

    API->>Orch: execute('tryon', Payload)
    Orch->>Router: selectProvider('tryon', Config)
    
    Router->>Redis: MGET Metrics for TryOn Providers
    Redis-->>Router: Historical Success/Latency Data
    Router->>Router: Calculate Weighted Rank
    Router-->>Orch: Selected Provider (e.g., TNB)

    Orch->>TNB: provider.call(Payload)
    
    alt Success
        TNB-->>Orch: Generated Image URL
        Orch->>Router: updateMetrics(Success, Latency)
        Router->>Redis: Persist Metric Update
        Orch-->>API: OrchestrationResult(OutputURL)
        
        API->>Storage: Fetch generated image & Persist
        Storage-->>API: Permanent CDN URL
        API->>DB: Upsert tryon_results
        API-->>User: Final Result URL
        
    else Timeout or Error
        TNB--xOrch: Timeout Exception
        Orch->>Router: updateMetrics(Fail, Latency)
        Router->>Redis: Increment Error Count
        Orch->>Router: selectProvider(fallback)
        Note right of Orch: Triggers adaptive retry
        Orch->>TNB: Retry or Fallback Provider
    end
```

## 2. Queue Flow (Heavy Tasks)

For long-running tasks like 3D model generation, VEXA uses a decoupled worker queue.

```mermaid
flowchart TD
    API[Client API Request] --> Q[BullMQ (Upstash Redis)]
    Q --> Worker[Background Worker]
    
    subgraph Worker Process
        Worker --> Check[Check Redis Status]
        Check --> Dispatch[Dispatch to Provider]
        Dispatch --> Poll[Poll Provider for Completion]
    end
    
    Poll -->|Success| Save[Save to DB/R2]
    Save --> Notify[Notify Client via WebSocket/Polling]
    
    Poll -->|Failure| Retry[Re-queue Job]
    Retry --> Check
```

## 3. Core Engine Components

### OrchestrationEngine
Acts as the executor. It runs the main `while` loop for retries, handles timeout abort signals, and ensures that failures are caught and logged appropriately without crashing the client request.

### SmartRouter
The decision-maker. It pulls historical data from Upstash Redis.
- **Scoring Algorithm**: Combines baseline provider weight, historical success rate, and historical latency to rank candidates dynamically.
- **Circuit Breaking**: If a provider fails continuously, its success rate drops rapidly, naturally routing traffic away from it until a manual intervention or gradual decay restores it.

### ProviderRegistry
The static inventory of capabilities.
- Stores instances of `AIProvider` subclasses (e.g., `TNBProvider`).
- Declares base capabilities (e.g., `tryon`, `video-gen`), base cost, and expected baseline latency.
