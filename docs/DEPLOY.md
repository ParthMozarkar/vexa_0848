# VEXA Deployment Guide

**Document Date:** 2026-05-13
**Platform:** Next.js 15 frontend on Vercel + Python FastAPI backend on Railway/Fly.io/Docker
**Audience:** Engineers performing first-time or repeat production deployments

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Setup](#2-repository-setup)
3. [Supabase Setup](#3-supabase-setup)
4. [Cloudflare R2 Setup](#4-cloudflare-r2-setup)
5. [Environment Configuration](#5-environment-configuration)
6. [Frontend Deployment to Vercel](#6-frontend-deployment-to-vercel)
7. [Backend Deployment](#7-backend-deployment)
   - [Option A: Docker (recommended)](#option-a-docker-recommended)
   - [Option B: Railway](#option-b-railway)
   - [Option C: Fly.io](#option-c-flyio)
8. [Post-Deploy Verification](#8-post-deploy-verification)
9. [Health Check Endpoints](#9-health-check-endpoints)
10. [Updating a Running Deployment](#10-updating-a-running-deployment)

---

## 1. Prerequisites

### Required Accounts

| Service | Purpose | URL |
|---------|---------|-----|
| Vercel | Next.js frontend hosting | https://vercel.com |
| Supabase | PostgreSQL + Auth + Storage | https://supabase.com |
| Cloudflare | R2 object storage | https://cloudflare.com |
| TheNewBlack AI | Virtual try-on API | https://thenewblack.ai |
| OpenAI | GPT-4o-mini + DALL-E 3 | https://platform.openai.com |
| BytePlus Ark | Seedream design images | https://www.bytepluses.com |
| BlackBox AI | Model/video generation | https://api.blackbox.ai |
| Meshy AI | 3D garment mesh | https://www.meshy.ai |
| Anakin AI | Fashion trend search | https://anakin.ai |
| Resend | Transactional email | https://resend.com |
| Google Cloud | Calendar API | https://console.cloud.google.com |

### Required Tools

```bash
# Verify tool versions before proceeding
node --version   # Must be 20.x or higher
npm --version    # Must be 9.x or higher
python3 --version  # Must be 3.10.x or higher (backend only)
git --version
vercel --version  # Install: npm install -g vercel
docker --version  # Only required for Option A backend deployment
```

### System Requirements

- **Frontend:** Any machine or CI runner with Node.js 20+
- **Backend (local dev):** 8 GB RAM minimum; CUDA-capable GPU recommended for full SMPL-X pipeline
- **Backend (production, minimal):** 4 GB RAM (GPU not required for basic avatar generation)
- **Backend (production, full SMPL-X):** 16 GB RAM + CUDA GPU

---

## 2. Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/vexa.git
cd vexa

# Frontend dependencies
cd frontend
npm install

# Verify the install
npm run type-check   # Should complete without errors after env vars are set
cd ..

# Backend dependencies (Python)
cd backend
pip install -r requirements.txt
# OR using uv (faster):
uv pip install -r requirements.txt
cd ..
```

---

## 3. Supabase Setup

### 3a. Create a New Supabase Project

1. Log in to https://supabase.com
2. Click "New Project" — choose your organization, region, and database password
3. Wait for provisioning (1–2 minutes)

### 3b. Apply Database Migrations

The schema SQL files are in `frontend/supabase/`. Apply them in order:

```bash
# Option 1: Supabase CLI (recommended)
cd frontend
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push

# Option 2: Manual via Supabase Dashboard SQL Editor
# Open: https://app.supabase.com/project/YOUR_PROJECT_REF/sql
# Run each file in frontend/supabase/ in alphabetical order
```

Key tables created: `users`, `api_keys`, `admin_logs`, `bookings`, `tryon_results`,
`clothing_assets`, `video_jobs`, `usage_logs`, `avatars`, `design_history`, `ip_usage_limits`.

### 3c. Collect Supabase Credentials

From the Supabase dashboard (Settings → API):

| Value | Where to find | Env var |
|-------|--------------|---------|
| Project URL | Settings → API → Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Anon (public) key | Settings → API → Project API keys → anon | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Service role key | Settings → API → Project API keys → service_role | `SUPABASE_SERVICE_ROLE_KEY` |

**Security:** The `service_role` key bypasses all Row Level Security. Never expose it in the
client bundle or commit it to git. It belongs only in server-side environment variables.

### 3d. Enable Row Level Security

Run these in the Supabase SQL editor to confirm RLS is active on sensitive tables:

```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- All tables should show rowsecurity = true
```

---

## 4. Cloudflare R2 Setup

### 4a. Create R2 Bucket

1. Log in to https://dash.cloudflare.com
2. Navigate to R2 → Create Bucket
3. Bucket name: `vexa-assets` (or your preferred name — update `R2_BUCKET_NAME`)
4. Region: Automatic (or nearest to your users)

### 4b. Create R2 API Token

1. R2 → Manage R2 API Tokens → Create API Token
2. Permissions: **Object Read and Write** on the `vexa-assets` bucket
3. Save: Account ID, Access Key ID, Secret Access Key, Public URL

### 4c. Enable Public Access (for CDN URLs)

1. R2 → `vexa-assets` → Settings → Public Access → Allow Access
2. Note the public URL: `https://pub-<hash>.r2.dev` or your custom domain

---

## 5. Environment Configuration

### 5a. Frontend Environment File

```bash
cd frontend
cp .env.local.example .env.local
```

Open `frontend/.env.local` and fill in all values. See `docs/ENV-REQUIREMENTS.md` for the
complete variable reference with types, defaults, and security notes.

**Minimum required variables for try-on to work:**

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
TNB_API_KEY=your_tnb_api_key
OPENAI_API_KEY=sk-...
VEXA_ADMIN_KEY=your_admin_secret_here
```

### 5b. Backend Environment File

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in all values.

**Minimum required:**

```
INTERNAL_SERVICE_TOKEN=generate_a_long_random_secret_here
NEXT_PUBLIC_APP_URL=https://your-frontend-domain.vercel.app
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=vexa-assets
R2_PUBLIC_URL=https://pub-HASH.r2.dev
SMPLX_MODEL_PATH=/app/models/smplx
```

**Generate a secure `INTERNAL_SERVICE_TOKEN`:**

```bash
# Generate a cryptographically random 64-character token
python3 -c "import secrets; print(secrets.token_hex(32))"
# OR
node -e "require('crypto').randomBytes(32).toString('hex').then ? require('crypto').randomBytes(32).toString('hex') : console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The **same value** must be set as `INTERNAL_SERVICE_TOKEN` in the backend AND as
`AVATAR_SERVICE_URL`'s corresponding token in the frontend env (see `AVATAR_SERVICE_URL`).
Actually: both sides read `INTERNAL_SERVICE_TOKEN` — set it to the same secret in both `.env` files.

---

## 6. Frontend Deployment to Vercel

### 6a. Initial Deploy

```bash
cd frontend

# Login to Vercel (one-time)
vercel login

# Link or create project
vercel link
# Follow prompts: link to existing project or create new one
# Framework: Next.js (auto-detected)
# Root directory: . (already in frontend/)

# Deploy to production
vercel --prod
```

### 6b. Configure Environment Variables in Vercel Dashboard

Vercel must have all env vars set separately from your local `.env.local`:

1. Go to https://vercel.com/dashboard → your project → Settings → Environment Variables
2. Add each variable. Set the target to **Production** (and optionally Preview):

```
NEXT_PUBLIC_SUPABASE_URL          → Production + Preview
NEXT_PUBLIC_SUPABASE_ANON_KEY     → Production + Preview
SUPABASE_SERVICE_ROLE_KEY         → Production only (never Preview if Preview has public access)
TNB_API_KEY                       → Production only
OPENAI_API_KEY                    → Production only
SEEDREAM_API_KEY                  → Production only
BLACKBOX_API_KEY                  → Production only
MESHY_API_KEY                     → Production only
ANAKIN_API_KEY                    → Production only
R2_ACCOUNT_ID                     → Production only
R2_ACCESS_KEY_ID                  → Production only
R2_SECRET_ACCESS_KEY              → Production only
R2_PUBLIC_URL                     → Production + Preview
RESEND_API_KEY                    → Production only
GOOGLE_CLIENT_EMAIL               → Production only
GOOGLE_PRIVATE_KEY                → Production only (multi-line — paste as-is with \n)
GOOGLE_CALENDAR_ID                → Production only
VEXA_ADMIN_KEY                    → Production only
AVATAR_SERVICE_URL                → Production only (your Python service URL)
INTERNAL_SERVICE_TOKEN            → Production only
```

**Important:** `NEXT_PUBLIC_*` variables are embedded in the client bundle and visible to all
users. Never put secrets in variables prefixed with `NEXT_PUBLIC_`.

### 6c. Verify Function Timeout Configuration

The `frontend/vercel.json` file pre-configures longer timeouts for AI-heavy routes:

```json
{
  "functions": {
    "src/app/api/tryon/route.ts": { "maxDuration": 120 },
    "src/app/api/clothing/route.ts": { "maxDuration": 60 }
  }
}
```

Verify this file is committed and present. The default Vercel function timeout is 10 seconds,
which is insufficient for TNB try-on calls (5–30 seconds).

### 6d. Set Custom Domain (Optional)

1. Vercel Dashboard → your project → Settings → Domains
2. Add your domain and follow DNS configuration instructions
3. TLS is provisioned automatically by Vercel

---

## 7. Backend Deployment

The Python service runs separately from the Next.js frontend. Choose one option:

### Option A: Docker (Recommended)

```dockerfile
# frontend/Dockerfile is not yet added — use this example Dockerfile in backend/
# backend/Dockerfile:
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for mediapipe, cv2
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Download SMPL-X model weights (or mount as volume)
# RUN python scripts/download_models.py

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build and run
cd backend
docker build -t vexa-backend:latest .
docker run -d \
  --name vexa-backend \
  -p 8000:8000 \
  --env-file .env \
  -v /path/to/smplx_models:/app/models/smplx \
  vexa-backend:latest

# Verify running
curl http://localhost:8000/health
# Expected: {"status": "healthy", "service": "vexa-avatar"}
```

**To update:**

```bash
docker build -t vexa-backend:v2 .
docker stop vexa-backend
docker rm vexa-backend
docker run -d --name vexa-backend -p 8000:8000 --env-file .env vexa-backend:v2
```

### Option B: Railway

1. Log in to https://railway.app
2. New Project → Deploy from GitHub repo
3. Select the `backend/` directory as the root
4. Railway auto-detects Python and uses `uvicorn main:app`
5. Add environment variables in Railway's Variables section (same as `backend/.env`)
6. Note the Railway service URL (e.g., `https://vexa-backend-production.up.railway.app`)
7. Set `AVATAR_SERVICE_URL=https://vexa-backend-production.up.railway.app` in Vercel

### Option C: Fly.io

```bash
cd backend

# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login and launch
flyctl auth login
flyctl launch --name vexa-backend --region sin --no-deploy

# Set secrets (equivalent of env vars)
flyctl secrets set INTERNAL_SERVICE_TOKEN=your_token
flyctl secrets set NEXT_PUBLIC_APP_URL=https://your-frontend.vercel.app
flyctl secrets set R2_ENDPOINT=https://YOUR_ACCOUNT.r2.cloudflarestorage.com
flyctl secrets set R2_ACCESS_KEY_ID=your_key
flyctl secrets set R2_SECRET_ACCESS_KEY=your_secret
flyctl secrets set R2_BUCKET_NAME=vexa-assets
flyctl secrets set R2_PUBLIC_URL=https://pub-HASH.r2.dev
flyctl secrets set SMPLX_MODEL_PATH=/app/models/smplx

# Deploy
flyctl deploy
```

The service URL will be `https://vexa-backend.fly.dev`. Set this as `AVATAR_SERVICE_URL` in Vercel.

---

## 8. Post-Deploy Verification Checklist

Run these checks immediately after each deployment:

### Frontend Health

- [ ] `GET https://your-domain.vercel.app/api/health` returns `{"status":"ok"}`
- [ ] Home page loads without console errors
- [ ] `/studio` page loads and shows the upload UI
- [ ] Login flow works: sign up a test user, receive confirmation email, log in

### API Authentication

- [ ] `GET /api/dashboard/stats` with no `x-vexa-admin-key` header returns `401`
- [ ] `GET /api/keys/validate` with no key returns `{"valid":false}` (not `true`)
- [ ] `POST /api/studio/trends` with no auth returns `401`

### Image Proxy Security

- [ ] `GET /api/proxy?url=http://169.254.169.254/latest/meta-data/` returns `400` or `403`
- [ ] `GET /api/proxy?url=http://localhost:8000/` returns `400` or `403`

### File Upload Security

- [ ] Upload a `.html` file renamed to `.jpg` — server returns `415 Unsupported Media Type`
- [ ] Upload a valid JPEG — returns `200` with a public URL

### Python Service

- [ ] `GET https://your-python-service/health` returns `{"status":"healthy"}`
- [ ] `POST /api/avatar/generate` with a valid Supabase Bearer token returns a response
  (placeholder GLB if SMPL-X model weights not loaded, or real avatar URL if fully configured)

### Marketplace Key Flow

- [ ] Use `VEXA_ADMIN_KEY` to call `POST /api/keys/generate` — returns a key
- [ ] Use that key as `x-vexa-key` to call `GET /api/keys/validate` — returns `{"valid":true}`
- [ ] Revoke the key via `POST /api/keys/revoke` — validate returns `{"valid":false}`

---

## 9. Health Check Endpoints

| Endpoint | Method | Auth | Expected Response |
|----------|--------|------|------------------|
| `/api/health` | GET | None | `{"status":"ok","timestamp":"..."}` |
| `{AVATAR_SERVICE_URL}/health` | GET | None | `{"status":"healthy","service":"vexa-avatar"}` |

Use these endpoints in your uptime monitoring (e.g., Vercel's built-in monitoring, UptimeRobot,
or a custom Cloudflare Worker health check).

---

## 10. Updating a Running Deployment

### Frontend Update (Vercel)

```bash
cd frontend

# After making changes, commit and push to main branch
git add .
git commit -m "feat: describe your change"
git push origin main
# Vercel auto-deploys on push to main (if GitHub integration is configured)

# OR trigger manual deploy:
vercel --prod
```

### Instant Rollback (Vercel)

If a deployment introduces a regression:
1. Vercel Dashboard → your project → Deployments
2. Find the last known-good deployment
3. Click the three-dot menu → "Promote to Production"
4. Rollback is instant (no downtime)

See `docs/ROLLBACK.md` for full rollback procedures including database rollback.

### Backend Update (Docker)

```bash
# Tag the current running image before updating
docker tag vexa-backend:latest vexa-backend:rollback

# Build and deploy new version
cd backend
git pull
docker build -t vexa-backend:latest .
docker stop vexa-backend
docker run -d --name vexa-backend -p 8000:8000 --env-file .env vexa-backend:latest

# If broken, rollback:
docker stop vexa-backend
docker run -d --name vexa-backend -p 8000:8000 --env-file .env vexa-backend:rollback
```

---

*Deployment guide: 2026-05-13 | Phase 8 documentation pass*
