# External Integrations

**Analysis Date:** 2026-05-13

## APIs & External Services

**Virtual Try-On:**
- The New Black (TNB) - AI garment-on-model try-on rendering
  - SDK/Client: Direct `fetch` to `https://thenewblack.ai/api/1.1/wf/<endpoint>`
  - Auth: `?api_key=<key>` query param
  - Env var: `TNB_API_KEY` (also `NEWBLACK_API_KEY` as fallback)
  - Used in: `frontend/src/app/api/tryon/route.ts` (lines 156, 183)

**AI Image Generation:**
- OpenAI (DALL-E 3 + GPT-4o-mini) - Fashion image flat-lay generation and prompt engineering
  - SDK/Client: `openai ^6.37.0` npm package + direct `fetch` to `https://api.openai.com/v1/`
  - Auth: `Authorization: Bearer <key>` header
  - Env var: `OPENAI_API_KEY`
  - Used in: `frontend/src/app/api/studio/design/route.ts`, `frontend/src/app/api/studio/trends/route.ts`
- BytePlus Ark / Seedream - Primary fashion design image generation (DALL-E fallback)
  - SDK/Client: Direct `fetch` to `https://ark.ap-southeast.bytepluses.com/api/v3/images/generations`
  - Auth: `Authorization: Bearer <key>` header
  - Env vars: `SEEDREAM_API_KEY` (also checked as `BYTEDANCE_API_KEY`), `SEEDREAM_ENDPOINT`, `SEEDREAM_MODEL` (default: `seedream-4-0-250828`)
  - Used in: `frontend/src/app/api/studio/design/route.ts` (lines 115-148; tried first before DALL-E fallback)
- BlackBox AI - Model image generation + video generation
  - SDK/Client: Direct `fetch` to `https://api.blackbox.ai/api/v1/model-gen` and `https://api.blackbox.ai/api/v1/video-gen`
  - Auth: `Authorization: Bearer <key>` header
  - Env var: `BLACKBOX_API_KEY`
  - Used in: `frontend/src/app/api/studio/model-gen/route.ts`, `frontend/src/app/api/studio/video-gen/route.ts`

**3D Asset Generation:**
- Meshy AI - Image-to-3D garment mesh conversion
  - SDK/Client: Direct `fetch` to `https://api.meshy.ai/openapi/v1`
  - Auth: `Authorization: Bearer <key>` header
  - Env var: `MESHY_API_KEY`
  - Used in: `frontend/src/app/api/clothing/route.ts`, `frontend/src/app/api/clothing/status/[taskId]/route.ts`
  - Pattern: async task submission → polling via separate status endpoint (serverless-safe)

**Web Search / Trends:**
- Anakin AI - Fashion trend web search
  - SDK/Client: Direct `fetch` to `https://api.anakin.io/v1/search`
  - Auth: `X-API-Key` header
  - Env var: `ANAKIN_API_KEY`
  - Used in: `frontend/src/app/api/studio/trends/route.ts`

**Machine Learning Inference (Backend):**
- Hugging Face Inference API - IDM-VTON virtual try-on model (frame-by-frame video try-on)
  - SDK/Client: Direct `requests.post` to `https://api-inference.huggingface.co/models/yisol/IDM-VTON`
  - Auth: `Authorization: Bearer <hf_key>` header
  - Used in: `backend/pipeline/video_processor.py` (line 14, 74)
  - Note: HF key passed as `hf_key` parameter from caller

**AI Pipeline SDKs (Backend — listed in requirements, not yet in active routes):**
- Deepgram SDK 2.12.0 - Speech-to-text (`backend/requirements.txt`)
- Groq 1.0.0 - LLM inference (`backend/requirements.txt`)
- Pipecat AI 0.0.103 - Conversational AI pipeline (`backend/requirements.txt`)
- Sarvam AI 0.1.25 - Indian language AI services (`backend/requirements.txt`)
- Twilio 9.10.2 - Voice/SMS communications (`backend/requirements.txt`)

## Data Storage

**Databases:**
- Supabase (hosted PostgreSQL)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser/public)
  - Server-side: `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
  - Client: `@supabase/supabase-js ^2.101.1`
  - Client instantiation: `frontend/src/lib/supabase.ts` (typed via `src/types/database.ts`)
  - Tables (from `frontend/supabase/*.sql`):
    - `users` - User profiles, body measurements, avatar_url
    - `api_keys` - Marketplace API key hashes + metadata
    - `admin_logs` - Admin action audit trail
    - `bookings` - Demo booking slots
    - `tryon_results` - Try-on job results
    - `clothing_assets` - Clothing asset records
    - `video_jobs` - Background video try-on job tracking
    - `usage_logs` - API call usage tracking
    - `avatars` - Avatar storage metadata

**File Storage:**
- Cloudflare R2 (primary) - Object storage for images, GLB files, videos
  - SDK: `@aws-sdk/client-s3 ^3.1028.0` (S3-compatible API)
  - Endpoint: `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`
  - Bucket: `vexa-assets` (configurable via `R2_BUCKET_NAME`)
  - Env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL`
  - Frontend client: `frontend/src/lib/r2.ts` (`uploadToR2` function — returns `null` gracefully if unconfigured)
  - Backend client: `backend/pipeline/r2_uploader.py` (boto3-based, used by SMPL-X pipeline)
  - Used for: design result images, avatar GLB files, video try-on results
- Supabase Storage (fallback) - Used when R2 is not configured
  - Bucket: `avatars`
  - Fallback logic in: `frontend/src/app/api/studio/design/route.ts` (lines 46-56)

**Caching:**
- Next.js ISR / `revalidate` headers on proxy route (`frontend/src/app/api/proxy/route.ts`)
- No dedicated caching layer (Redis etc.) detected

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (email/password)
  - Implementation: Custom Next.js API routes wrap Supabase Auth
  - Sign-up: `frontend/src/app/api/auth/signup/route.ts` — calls `supabase.auth.admin.createUser`, inserts body measurements into `users` table
  - Login: `frontend/src/app/api/auth/login/route.ts` — calls `supabase.auth.signInWithPassword`, returns JWT tokens
  - Session validation: `supabase.auth.getUser(token)` in protected API routes
  - Client-side guard: `frontend/src/middleware/onboardingGuard.tsx`

**Marketplace / B2B API Key Auth:**
- Custom SHA-256 hashed API keys stored in Supabase `api_keys` table
  - Raw key format: `vexa_<uuid>`
  - Only key hash stored; raw key shown once at generation time only
  - Header: `x-vexa-key: <raw_key>`
  - Validation middleware: `frontend/src/lib/apiKeyMiddleware.ts` (`validateApiKey`, `withApiKey`, `requireApiKey`)
  - Key generation: `frontend/src/app/api/keys/generate/route.ts` (requires `VEXA_ADMIN_KEY`)
  - Key management routes: `frontend/src/app/api/keys/list/`, `keys/revoke/`, `keys/validate/`

**Internal Service Auth:**
- Bearer token between Next.js frontend and Python backend
  - Env var: `INTERNAL_SERVICE_TOKEN` (must match on both sides)
  - Used in: `backend/main.py` (`verify_internal_token` dependency), `frontend/src/app/api/webhook/avatar-ready/route.ts`

**Admin Auth:**
- Single admin secret key
  - Env var: `VEXA_ADMIN_KEY`
  - Used in: `frontend/src/app/api/keys/generate/route.ts`, admin panel routes

## Monitoring & Observability

**Error Tracking:**
- No third-party error tracking service detected (no Sentry, Datadog, etc.)

**Analytics:**
- Google Analytics 4 via `@next/third-parties` `GoogleAnalytics` component
  - Env var: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  - Integrated in: `frontend/src/app/layout.tsx` (line 71)
- Vercel Analytics via `@vercel/analytics/react` `Analytics` component
  - Integrated in: `frontend/src/app/layout.tsx` (line 4)

**Logs:**
- Frontend: `console.log`/`console.warn`/`console.error` with structured prefixes (e.g., `[r2]`, `[Design Persist]`)
- Backend: Python `logging` module with `loguru 0.7.3` installed; structured via `logger = logging.getLogger("vexa")` in `backend/main.py`

## CI/CD & Deployment

**Hosting:**
- Vercel (primary) - `frontend/vercel.json` configures function timeouts per route
- Netlify (alternative) - `@netlify/plugin-nextjs` devDependency in `frontend/package.json`

**CI Pipeline:**
- Not detected (no `.github/workflows/`, CircleCI, etc.)

## Environment Configuration

**Required env vars (frontend):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (required at startup; throws if missing)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (required at startup; throws if missing)
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase admin key (falls back to anon key if missing)
- `OPENAI_API_KEY` - Required for design prompt generation and DALL-E fallback
- `TNB_API_KEY` - Required for virtual try-on
- `MESHY_API_KEY` - Required for 3D garment generation
- `BLACKBOX_API_KEY` - Required for model-gen and video-gen
- `ANAKIN_API_KEY` - Required for trends search
- `SEEDREAM_API_KEY` - Required for primary design image generation
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` - R2 storage (optional; falls back to Supabase Storage)
- `RESEND_API_KEY` - Required for booking confirmation emails
- `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID` - Required for Google Calendar booking
- `VEXA_ADMIN_KEY` - Required for admin/key management endpoints
- `AVATAR_SERVICE_URL` - URL of Python backend (default: `http://127.0.0.1:8000`)

**Required env vars (backend):**
- `INTERNAL_SERVICE_TOKEN` - Bearer token for Next.js → Python auth
- `NEXT_PUBLIC_APP_URL` - Frontend origin URL for CORS and avatar URL construction
- `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` - Required for `generate-avatar-full`
- `SMPLX_MODEL_PATH` - Path to SMPL-X model weight files (required for full pipeline)

**Secrets location:**
- Frontend: `frontend/.env.local` (gitignored); example at `frontend/.env.local.example`
- Backend: `backend/.env` (gitignored); example at `backend/.env.example`

## Webhooks & Callbacks

**Incoming:**
- `POST /api/webhook/avatar-ready` - Receives avatar generation completion from Python backend
  - Auth: `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>` header
  - Body: `{ userId, avatarUrl }`
  - Handler: `frontend/src/app/api/webhook/avatar-ready/route.ts`
  - Action: Updates `users.avatar_url` in Supabase

**Outgoing:**
- Marketplace webhooks - When API key has `webhook_url` set, callbacks are sent to marketplace on try-on completion
  - Configured per API key in Supabase `api_keys.webhook_url` column
  - Context available via `marketplaceCtx.webhookUrl` from `frontend/src/lib/apiKeyMiddleware.ts`

---

*Integration audit: 2026-05-13*
