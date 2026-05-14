# VEXA Security Architecture

Security in VEXA is designed around a Zero-Trust approach. Because VEXA processes user-uploaded media and integrates with third-party generative networks, strict guardrails are in place to prevent injection, SSRF, and data leakage.

## Trust Boundaries & Validation Flow

```mermaid
graph TD
    User[User/Client]
    
    subgraph "VEXA Security Perimeter"
        API[/api/* Routes]
        SSRF[SSRF Guard / URL Validator]
        AuthGuard[Supabase / Enterprise Auth]
        Bucket[R2 Upload Sanitizer]
    end
    
    subgraph "External Providers"
        TNB[TheNewBlack]
        OpenAI[OpenAI]
    end

    User -->|POST Request| API
    API --> AuthGuard
    AuthGuard -->|If Valid| SSRF
    
    SSRF -->|Malicious IP / Localhost| Block[Reject 403]
    SSRF -->|Safe HTTPS URL| Bucket
    
    Bucket -->|Sanitized Public URL| TNB
```

## Security Posture

### 1. SSRF Protection (Server-Side Request Forgery)
When a user provides an image URL for VEXA to process, the backend must download that image to send it to the AI provider. Without protection, a malicious user could pass `http://localhost:3000/admin` or `http://169.254.169.254` (AWS Metadata).
- **Implementation**: `src/lib/ssrfGuard.ts` strictly evaluates all incoming URLs. It rejects local IPs, private subnets, and non-HTTPS schemes.

### 2. Multi-Tenant Isolation
B2B clients using the VEXA SDK connect via `x-vexa-key`. 
- **Implementation**: `validateApiKey` checks the hashed API key against the `api_keys` table. All database queries subsequently enforce isolation using the `marketplace_id` as a scoping variable.

### 3. Media Sanitization
VEXA never executes files.
- All uploads are buffered, checked for valid image `content-type` headers, and rewritten with secure `.png` or `.jpg` extensions before being committed to Cloudflare R2 or Supabase Storage.

### 4. Secret Handling
- No AI provider API keys (TNB, Meshy, OpenAI) are ever exposed to the client. They are strictly environment variables (`process.env`) loaded safely inside Node.js Serverless functions.
- Supabase interaction uses the `Anon Key` on the client (safe, restricted by RLS) and the `Service Role Key` securely on the backend.

### 5. Data Residency Readiness
Through the `SecurityEngine`, VEXA allows B2B tenants to specify regional compliance (e.g., EU vs US), enforcing routing logic that restricts user data from crossing non-compliant geographic borders during AI processing.
