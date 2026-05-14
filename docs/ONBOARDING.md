# VEXA Developer Onboarding Guide

**Document Date:** 2026-05-14
**Version:** 1.0
**Audience:** New engineers joining the VEXA project; estimated setup time: 45–90 minutes

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone and Setup](#2-clone-and-setup)
3. [Start Dev Environment](#3-start-dev-environment)
4. [Your First API Call](#4-your-first-api-call)
5. [Running Tests](#5-running-tests)
6. [Key Development Workflows](#6-key-development-workflows)
7. [Common Issues and Fixes](#7-common-issues-and-fixes)

---

## 1. Prerequisites

### Required Accounts

Create accounts for these services before starting. You will need API keys from each.

| Service | Purpose | URL |
|---------|---------|-----|
| Supabase | PostgreSQL database + Auth + Storage | https://supabase.com |
| Cloudflare | R2 object storage for images and GLB files | https://cloudflare.com |
| TheNewBlack AI | Virtual try-on API (core feature) | https://thenewblack.ai |
| OpenAI | GPT-4o-mini + DALL-E 3 for design features | https://platform.openai.com |
| Upstash | Managed Redis for queues + cache | https://upstash.com |

The following services are optional for local development (features degrade gracefully without them):

| Service | Purpose |
|---------|---------|
| BlackBox AI | AI model photo generation |
| Meshy AI | 3D garment mesh generation |
| Anakin AI | Fashion trend search |
| Resend | Transactional email for bookings |
| Google Cloud | Calendar API for booking slots |

### Required Local Tools

```bash
# Verify each tool before starting
node --version       # Required: 20.x or higher
npm --version        # Required: 9.x or higher
python3 --version    # Required: 3.11.x (for backend; 3.10+ acceptable)
git --version        # Required: any recent version

# Optional but recommended
docker --version     # For containerised backend development
vercel --version     # For deployment; install: npm install -g vercel
```

### System Requirements

| Environment | RAM | GPU | Notes |
|-------------|-----|-----|-------|
| Frontend-only dev | 4 GB | Not required | Full studio UI, API routes, no avatar generation |
| Full local dev | 8 GB | Recommended | Enables SMPL-X avatar pipeline |
| Production backend | 16 GB | CUDA required | Full SMPL-X + face texture extraction |

---

## 2. Clone and Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/vexa.git
cd vexa
```

### Step 2: Configure Frontend Environment

```bash
cd frontend

# Copy the production environment template
cp .env.example.production .env.local

# Open the file and fill in all values (see required vars below)
# Use your editor of choice:
code .env.local
```

**Minimum required variables to get the try-on working locally:**

```bash
# Supabase (from https://app.supabase.com -> Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# TheNewBlack AI (primary try-on provider)
TNB_API_KEY=your_tnb_api_key_here

# OpenAI (design + trends features)
OPENAI_API_KEY=sk-proj-...

# Cloudflare R2 (image storage; omit for in-memory fallback)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=vexa-assets
R2_PUBLIC_URL=https://pub-HASH.r2.dev

# Redis (queues + cache; omit to fall back to in-memory LRU)
REDIS_URL=rediss://default:PASSWORD@ENDPOINT.upstash.io:6379

# Admin key (for admin API endpoints)
VEXA_ADMIN_KEY=local_dev_admin_key_change_in_production

# Python avatar service (set to local if running backend; or leave as placeholder)
AVATAR_SERVICE_URL=http://127.0.0.1:8000
INTERNAL_SERVICE_TOKEN=local_dev_internal_token_change_in_production
```

See `docs/ENV-REQUIREMENTS.md` for the complete variable reference.

### Step 3: Configure Backend Environment

```bash
cd ../backend
cp .env.example .env

# Fill in backend variables:
code .env
```

**Minimum backend variables:**

```bash
INTERNAL_SERVICE_TOKEN=local_dev_internal_token_change_in_production
NEXT_PUBLIC_APP_URL=http://localhost:4028
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=vexa-assets
R2_PUBLIC_URL=https://pub-HASH.r2.dev
SMPLX_MODEL_PATH=/path/to/smplx/models
```

**The `INTERNAL_SERVICE_TOKEN` must be identical** in both `frontend/.env.local` and
`backend/.env`. Generate a secure value:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Step 4: Apply Database Migrations

```bash
cd frontend
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Or manually: open https://app.supabase.com/project/YOUR_REF/sql and run each file
in `frontend/supabase/` in alphabetical order.

---

## 3. Start Dev Environment

### Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server (runs on port 4028)
npm run dev
```

The app is now available at: `http://localhost:4028`

Verify the API is up:
```bash
curl http://localhost:4028/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Python Backend (Avatar Service)

In a separate terminal:

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt
# OR with uv (faster):
uv pip install -r requirements.txt

# Start the FastAPI server (port 8000)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Verify the backend is up:
```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy","service":"vexa-avatar"}
```

### BullMQ Workers (for async video/avatar jobs)

In a third terminal:

```bash
cd frontend

# Start the AI worker process (handles video try-on, avatar, meshy-gen queues)
npm run worker
# OR if no script exists:
npx ts-node src/workers/aiWorker.ts
```

The worker must be running for `/api/tryon/video`, `/api/avatar/generate`, and
`/api/studio/model-gen` to process jobs. Without it, jobs queue up but never execute.

---

## 4. Your First API Call

### Example: Image Try-On (Synchronous)

```bash
# Replace with real image URLs and a valid x-vexa-key (or omit for demo/IP-limited mode)
curl -X POST http://localhost:4028/api/tryon \
  -H "Content-Type: application/json" \
  -H "x-vexa-key: your_vexa_api_key" \
  -d '{
    "personImageUrl": "https://example.com/person.jpg",
    "garmentImageUrl": "https://example.com/garment.jpg",
    "category": "tops",
    "userId": "user_123"
  }'
```

Expected response:
```json
{
  "resultUrl": "https://pub-HASH.r2.dev/studio/tryons/result_xyz.jpg",
  "status": "ready",
  "fitLabel": "Regular Fit",
  "recommendedSize": "M",
  "fitScore": 82,
  "generationsRemaining": 9
}
```

### Example: Async Video Try-On (Queue + Poll)

```bash
# Step 1: Enqueue the job
curl -X POST http://localhost:4028/api/tryon/video \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -d '{
    "videoUrl": "https://example.com/person_video.mp4",
    "productImageUrl": "https://example.com/garment.jpg",
    "productId": "prod_123"
  }'
# Returns: {"jobId": "job_abc123", "status": "queued"}

# Step 2: Poll for completion
curl http://localhost:4028/api/jobs/job_abc123 \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT"
# Returns: {"status": "completed", "result": {"resultUrl": "...", "status": "ready"}}
```

### Example: AI Design Generation

```bash
curl -X POST http://localhost:4028/api/studio/design \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT" \
  -d '{
    "prompt": "A modern navy blue blazer with gold buttons",
    "style": "professional"
  }'
```

---

## 5. Running Tests

### Frontend Unit Tests (Vitest)

```bash
cd frontend

# Run all tests once
npm test

# Run in watch mode during development
npm run test:watch

# Run with coverage report
npm run test:coverage
```

Tests are in `frontend/src/lib/__tests__/`. Key test files:

| File | What it tests |
|------|--------------|
| `cache.test.ts` | Redis cache hit/miss, LRU fallback |
| `fitEngine.test.ts` | Fit label calculation, size chart logic |
| `crypto.test.ts` | API key hashing, constant-time comparison |
| `ipRateLimit.test.ts` | Per-IP rate limit enforcement |
| `costTracker.test.ts` | Per-call cost logging |

### Python Backend Tests

```bash
cd backend

# Run all tests
pytest tests/

# Run with verbose output
pytest tests/ -v

# Run a specific test file
pytest tests/test_avatar.py -v

# Run with coverage
pytest tests/ --cov=. --cov-report=term-missing
```

### Type Checking

```bash
cd frontend
npm run type-check   # Runs tsc --noEmit; must pass with zero errors
```

### Linting

```bash
cd frontend
npm run lint         # ESLint check
npm run format       # Prettier format check
```

---

## 6. Key Development Workflows

### Workflow A: Adding a New AI Provider

1. Create `frontend/src/lib/providers/myProvider.ts` implementing `AIProvider<TInput, TOutput>`
2. Register in `initializeRegistry()` in `frontend/src/lib/providers/registry.ts`
3. Add cost estimate to `PROVIDER_COSTS_USD` in `frontend/src/lib/costTracker.ts`
4. Add timeout to `PROVIDER_TIMEOUTS` in `frontend/src/lib/providerTimeouts.ts`
5. Add worker handler in `frontend/src/workers/aiWorker.ts` if the provider is async
6. Export from `frontend/src/lib/providers/index.ts`
7. Update `docs/PROVIDER-MAP.md` with the new provider row

See `docs/PROVIDER-INTEGRATION.md` for full step-by-step instructions and code templates.

### Workflow B: Adding a New API Route

1. Create directory: `frontend/src/app/api/my-feature/route.ts`
2. Export the appropriate HTTP verb handler: `export async function POST(req: NextRequest): Promise<NextResponse>`
3. Apply auth middleware at the top of the handler:
   ```typescript
   const { ctx, error } = await requireApiKey(req);
   if (error) return error;
   ```
4. Wrap all logic in `try/catch (err: unknown)` and return `NextResponse.json({ error }, { status: 500 })`
5. Use the service-role Supabase client for DB operations: `import { getServiceSupabase } from '@/lib/supabase'`
6. Add any new env vars to `docs/ENV-REQUIREMENTS.md`

### Workflow C: Updating Database Types

After adding or modifying Supabase tables:

```bash
cd frontend

# Regenerate types from your live Supabase project
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_REF \
  --schema public \
  > src/types/database.ts

# Verify type-check still passes
npm run type-check
```

### Workflow D: Adding a New Queue

1. Define the queue name in `frontend/src/lib/queues.ts`
2. Add the worker handler in `frontend/src/workers/aiWorker.ts`
3. Set concurrency env var (e.g., `WORKER_CONCURRENCY_MYQUEUE`)
4. Add timeout constant in `frontend/src/lib/providerTimeouts.ts`
5. Update queue topology table in `docs/AI-INFRA-ARCH.md`

### Workflow E: Running a Database Migration

```bash
cd frontend

# Create a new migration file
npx supabase migration new my_migration_name

# Edit the generated file in supabase/migrations/

# Apply to local Supabase (if using local dev)
npx supabase db reset

# Apply to production
npx supabase db push --linked
```

---

## 7. Common Issues and Fixes

### Issue: `REDIS_URL not set` warning in console

**Symptom:** Console prints `[cache] Redis not configured, using in-memory LRU fallback`.
Jobs enqueued to BullMQ will fail silently.

**Fix:** Set `REDIS_URL` in `frontend/.env.local`. Get a free Redis instance from
https://upstash.com (free tier: 10k requests/day). Format: `rediss://default:PASSWORD@HOST:PORT`

**If intentional (offline dev):** The cache falls back to in-memory LRU; async jobs (video,
avatar, meshy) will not process. Image try-on remains functional.

---

### Issue: Supabase connection error at startup

**Symptom:** API routes return `500` with `AuthApiError: Invalid API key` or
`connection refused`.

**Checklist:**
- Verify `NEXT_PUBLIC_SUPABASE_URL` ends in `.supabase.co` (no trailing slash)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is the `service_role` key, NOT the `anon` key
- Verify the Supabase project is not paused (free tier pauses after 7 days inactivity)
  — go to https://app.supabase.com and click "Resume project"
- Verify migrations were applied: `npx supabase db push`

---

### Issue: R2 bucket `NoSuchBucket` error

**Symptom:** Upload routes return `500`; logs show `NoSuchBucket` from AWS SDK.

**Checklist:**
- Verify `R2_BUCKET_NAME` matches the exact bucket name in Cloudflare dashboard
- Verify `R2_ACCOUNT_ID` is the Cloudflare account ID (found in dashboard URL)
- Verify `R2_ENDPOINT` format: `https://ACCOUNT_ID.r2.cloudflarestorage.com`
- The R2 access token must have `Object Read and Write` permissions on the specific bucket

**Fallback:** If R2 is not configured, `r2.ts` falls back to Supabase Storage automatically.
Try-on results are stored in Supabase Storage instead. No code change needed.

---

### Issue: Avatar generation returns placeholder GLB

**Symptom:** Avatar generate returns `{ avatarUrl: ".../placeholder.glb" }` instead of
a real avatar.

**Cause:** Either the Python backend is not running, or `SMPLX_MODEL_PATH` is not set to
a directory containing the SMPL-X model weights.

**Fix:**
1. Ensure the Python backend is running: `curl http://localhost:8000/health`
2. Download SMPL-X model weights from https://smpl-x.is.tue.mpg.de (requires registration)
3. Set `SMPLX_MODEL_PATH=/path/to/downloaded/models` in `backend/.env`
4. Restart the FastAPI server

---

### Issue: `INTERNAL_SERVICE_TOKEN` mismatch

**Symptom:** `POST /api/avatar/generate` returns `401 Unauthorized` from the Python service.

**Fix:** Ensure `INTERNAL_SERVICE_TOKEN` is set to the **identical value** in both
`frontend/.env.local` and `backend/.env`. Generate a fresh token and update both files:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

### Issue: Try-on returns `429 Too Many Requests`

**Symptom:** Image try-on works for first 2 requests then returns 429.

**Cause:** IP rate limit (`ip_usage_limits` table) allows only 2 try-ons per IP per 24h for
unauthenticated requests. This is by design for the demo/anonymous mode.

**Fix for development:** Use an `x-vexa-key` header or a valid Supabase JWT Bearer token.
Authenticated requests have higher per-user limits (`MAX_AI_CALLS_PER_USER_DAY`).

---

*Onboarding guide: 2026-05-14 — VEXA v4.0*
