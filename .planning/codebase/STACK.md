# Technology Stack

**Analysis Date:** 2026-05-13

## Languages

**Primary:**
- TypeScript 5.x - Frontend (Next.js app, API routes, all `frontend/src/`)
- Python 3.x - Backend avatar/video pipeline (`backend/`)

**Secondary:**
- JavaScript - Config files (`next.config.mjs`, `eslint.config.mjs`, `postcss.config.mjs`)
- SQL - Supabase schema migrations (`frontend/supabase/*.sql`)

## Runtime

**Environment:**
- Node.js 20.x (frontend) - inferred from `@types/node: ^20` in `frontend/package.json`
- Python 3.x (backend) - inferred from FastAPI + pytorch stack in `backend/requirements.txt`

**Package Manager:**
- npm (frontend) - Lockfile: `frontend/package-lock.json` present
- pip / uv (backend) - uv 0.11.7 listed in `backend/requirements.txt`; no lockfile detected

## Frameworks

**Core:**
- Next.js 15.1.11 - Full-stack React framework, App Router, all frontend routing and API routes (`frontend/src/app/`)
- React 19.0.3 - UI component rendering (`frontend/src/`)
- FastAPI 0.129.0 - Python REST API for avatar + video pipeline (`backend/main.py`)

**Testing:**
- Vitest - Frontend unit tests; config at `frontend/vitest.config.ts`; test files in `frontend/src/lib/__tests__/`

**Build/Dev:**
- TypeScript 5.x compiler (`tsc --noEmit` via `type-check` script)
- ESLint 9.x + TypeScript ESLint plugin - Linting (`frontend/eslint.config.mjs`)
- Prettier 3.5.3 - Code formatting (`frontend/package.json` format script)
- PostCSS 8.4.8 + Autoprefixer 10.4.2 - CSS processing (`frontend/postcss.config.js`)
- Tailwind CSS 3.4.6 - Utility-first CSS (`frontend/tailwind.config.js`)
- Uvicorn 0.41.0 - ASGI server for Python backend (`backend/start.sh`)

## Key Dependencies

**Critical (Frontend):**
- `@supabase/supabase-js ^2.101.1` - Database client, auth, storage (`frontend/src/lib/supabase.ts`)
- `@aws-sdk/client-s3 ^3.1028.0` - Cloudflare R2 uploads via S3-compatible API (`frontend/src/lib/r2.ts`)
- `openai ^6.37.0` - GPT-4o-mini prompt engineering + DALL-E 3 image generation (`frontend/src/app/api/studio/design/route.ts`, `frontend/src/app/api/studio/trends/route.ts`)
- `next 15.1.11` - Framework core
- `framer-motion ^12.38.0` - Animations throughout UI
- `recharts ^2.15.2` - Dashboard analytics charts (`frontend/src/app/dashboard/`)
- `googleapis ^144.0.0` - Google Calendar API for bookings (`frontend/src/app/api/bookings/route.ts`)
- `resend ^4.1.2` - Transactional email (`frontend/src/app/api/bookings/route.ts`)

**Critical (Backend):**
- `fastapi 0.129.0` - API server (`backend/main.py`)
- `torch 2.11.0` - Deep learning for SMPL-X avatar pipeline
- `smplx 0.1.28` - 3D human body parametric model for avatar generation (`backend/pipeline/body_generator.py`)
- `mediapipe` - Face landmark detection for face texture extraction (`backend/pipeline/face_texture.py`)
- `trimesh 4.11.5` - 3D mesh handling and GLB export (`backend/main.py`)
- `boto3 1.42.87` - Cloudflare R2 upload from Python backend (`backend/pipeline/r2_uploader.py`)
- `pipecat-ai 0.0.103` - AI voice/conversation pipeline (listed in requirements, future use)
- `deepgram-sdk 2.12.0` - Speech-to-text (listed in requirements, future use)
- `groq 1.0.0` - LLM inference (listed in requirements, future use)
- `twilio 9.10.2` - Communications (listed in requirements, future use)
- `sarvamai 0.1.25` - Sarvam AI SDK (listed in requirements, future use)

**Infrastructure (Frontend):**
- `@react-three/fiber ^9.5.0` + `@react-three/drei ^10.7.7` - 3D avatar viewer (`frontend/src/components/AvatarViewer/`)
- `@splinetool/react-spline ^4.1.0` - 3D hero/marketing scenes (`frontend/src/app/`)
- `three ^0.183.2` - WebGL/3D rendering engine
- `@react-three/xr ^6.6.29` - WebXR / AR support (`frontend/src/app/ar/`)
- `@tavily/core ^0.7.3` - Web search API (listed, not yet actively used in API routes)
- `@vercel/analytics ^2.0.1` - Web analytics (`frontend/src/app/layout.tsx`)
- `@next/third-parties ^16.2.4` - Google Analytics integration (`frontend/src/app/layout.tsx`)

## Configuration

**Environment:**
- Frontend: `.env.local` file (not committed); example at `frontend/.env.local.example`
- Backend: `.env` file (not committed); example at `backend/.env.example`
- Key frontend vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `TNB_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MESHY_API_KEY`, `BLACKBOX_API_KEY`, `ANAKIN_API_KEY`, `BYTEDANCE_API_KEY` / `SEEDREAM_API_KEY`, `RESEND_API_KEY`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `VEXA_ADMIN_KEY`, `PYTHON_SERVICE_URL`, `AVATAR_SERVICE_URL`
- Key backend vars: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `INTERNAL_SERVICE_TOKEN`, `NEXT_PUBLIC_APP_URL`, `SMPLX_MODEL_PATH`

**Build:**
- Next.js config: `frontend/next.config.mjs` (bundle optimization, image caching, AVIF/WebP formats)
- TypeScript config: `frontend/tsconfig.json` (strict mode, `@/*` path alias → `src/*`)
- Tailwind config: `frontend/tailwind.config.js`
- Netlify plugin: `@netlify/plugin-nextjs ^5.11.1` (configured as devDep)
- Vercel config: `frontend/vercel.json` (function maxDuration overrides for tryon + clothing routes)

## Platform Requirements

**Development:**
- Node.js 20+
- Python 3.10+ (for backend; smplx, mediapipe, torch requirements)
- CUDA-capable GPU recommended for `generate-avatar-full` SMPL-X pipeline
- Dev server runs on port 4028 (`next dev -p 4028`)
- Backend FastAPI runs on port 8000 (`AVATAR_SERVICE_URL=http://127.0.0.1:8000`)

**Production:**
- Dual deployment: Next.js frontend on Vercel (primary, `vercel.json` present) or Netlify (`@netlify/plugin-nextjs`)
- Python backend deployable separately (Uvicorn ASGI server)
- Cloudflare R2 for asset storage (bucket: `vexa-assets`)
- Supabase hosted (Postgres + Auth + Storage)

---

*Stack analysis: 2026-05-13*
