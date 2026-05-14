# VEXA Master System Architecture

This document provides a holistic view of the VEXA platform, illustrating how the frontend, backend, AI orchestration, and infrastructure layers interact.

## System Topology Diagram

```mermaid
graph TD
    %% User Interfaces
    Client[Web Client / Mobile App]
    B2B[B2B Tenant / Storefront]

    %% Edge / CDN
    CDN[Vercel Edge Network]
    
    %% Application Layer (Next.js)
    subgraph "VEXA Next.js Application"
        UI[UI Components / Studio]
        API_TryOn[/api/tryon]
        API_Video[/api/studio/video-gen]
        API_Fashion[/api/fashion-intelligence]
        API_Enterprise[/api/enterprise]
    end

    %% Orchestration Layer
    subgraph "AI Orchestration Engine"
        Orchestrator[OrchestrationEngine]
        Router[SmartRouter]
        Registry[ProviderRegistry]
    end

    %% Storage & Persistence
    subgraph "Persistence Layer"
        Redis[(Upstash Redis)]
        DB[(Supabase PostgreSQL)]
        Storage[(Cloudflare R2 / Supabase Storage)]
    end

    %% External AI Providers
    subgraph "External AI Providers"
        TNB[TheNewBlack API]
        Meshy[Meshy 3D API]
        OpenAI[OpenAI GPT-4o]
    end

    %% Background Processing
    Worker[Background Queue Worker]

    %% Connections
    Client -->|HTTPS| CDN
    B2B -->|SDK / API Key| CDN

    CDN --> UI
    CDN --> API_TryOn
    CDN --> API_Video
    CDN --> API_Fashion
    CDN --> API_Enterprise

    API_TryOn --> Orchestrator
    API_Video --> Orchestrator
    
    Orchestrator --> Router
    Router <-->|Fetch/Update Metrics| Redis
    Router --> Registry
    
    Registry --> TNB
    Registry --> Meshy
    Registry --> OpenAI
    
    Orchestrator -->|Queue Async Tasks| Worker
    Worker --> Registry

    API_TryOn -->|Save Metadata| DB
    API_TryOn -->|Persist Asset| Storage
    
    API_Fashion <-->|Read/Write User Preferences| DB
    API_Enterprise <-->|Tenant Analytics| DB
```

## Architectural Layers Explained

### 1. The Presentation & API Edge Layer
VEXA is built on **Next.js (App Router)** and deployed to **Vercel**. This allows us to serve the React frontend via a global CDN while executing API routes at the edge or on serverless functions.
- **Client**: Consumer-facing Web/Mobile application.
- **B2B Tenant**: Enterprise clients utilizing the VEXA SDK.

### 2. The Orchestration Layer
The core differentiator of VEXA. The `OrchestrationEngine` abstracts away direct dependencies on AI providers.
- **SmartRouter**: Uses historical metrics (success rate, latency) to dynamically route traffic.
- **ProviderRegistry**: Holds standardized `AIProvider` instances.

### 3. The Persistence Layer
We decouple state from the application servers to ensure horizontal scalability:
- **Upstash Redis**: Tracks real-time provider health metrics and manages queue state.
- **Supabase PostgreSQL**: Relational database handling user data, wardrobe state, tenant analytics, and security policies (RLS).
- **Cloudflare R2**: High-performance, low-cost object storage for generated assets (images/video).

### 4. External AI Providers
We integrate with specialized vendors to generate assets:
- **TheNewBlack**: Primary provider for hyper-realistic Try-On and motion video.
- **Meshy**: 3D asset generation pipeline.
- **OpenAI**: Core reasoning engine for the `AIStylist` and trend analysis.
