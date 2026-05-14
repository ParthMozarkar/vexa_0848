# VEXA — Enterprise Scale

## Current Milestone: v4.0 Enterprise Scale

**Goal:** Evolve VEXA into enterprise-grade scalable infrastructure without disrupting existing production functionality.

**Target features:**
- Multi-tenant architecture (org accounts, brand isolation, tenant-aware limits, enterprise quotas)
- Analytics + billing (usage metering, API metering, generation tracking, billing readiness)
- Admin systems (operational dashboards, provider monitoring, AI queue monitoring, failure analytics)
- Infra scaling design (worker/GPU scaling, CDN strategy, object storage, caching layers)
- Enterprise hardening (audit logging, compliance readiness, SLA architecture, backup strategies)
- Enterprise documentation (architecture, onboarding, deployment, provider integration, emergency recovery)
- Enterprise readiness report + scaling roadmap + infra topology
- Frontend API layer (typed apiClient, error normalization, useApiCall hook)
- State management cleanup (centralized loading/error states, Zustand selector hooks)
- Performance reports (bundle analysis, mobile readiness, frontend architecture map)

## What This Is

VEXA is an AI-powered virtual try-on and avatar platform built on Next.js 15 (frontend + API routes) and a Python FastAPI backend. It serves B2B marketplace clients via an API key system and end-users via a web app. v1.0 hardened the codebase for production security. v2.0 makes AI pipelines scalable: provider abstraction, async job queues, retry/failover, caching, and cost protection.

## Core Value

Scalable AI pipelines that preserve existing user-facing behavior while eliminating duplicate costs, single-provider lock-in, and synchronous blocking on heavy AI workloads.

## Requirements

### Validated

- ✓ Virtual try-on via TheNewBlack AI API — existing
- ✓ Avatar generation (stub + full SMPL-X pipeline) — existing
- ✓ B2B API key authentication via x-vexa-key header — existing
- ✓ Image upload to Cloudflare R2 — existing
- ✓ Supabase auth (JWT Bearer tokens) — existing
- ✓ Image proxy at /api/proxy — existing (insecure)
- ✓ Rate limiting (IP-based, in-memory) — existing

### Active

**SSRF / Proxy Hardening:**
- [ ] /api/proxy validates URL against allowlist (image-hosts.config.mjs domains)
- [ ] /api/proxy blocks non-HTTPS schemes
- [ ] /api/proxy blocks RFC-1918, loopback, link-local IP ranges
- [ ] /api/proxy enforces response size limit (10MB)
- [ ] All internal fetch() calls in tryon/route.ts validated before use

**Auth Hardening:**
- [ ] /api/keys/validate demo bypass removed — missing key returns 401
- [ ] INTERNAL_SERVICE_TOKEN missing in production causes hard startup failure
- [ ] Backend /api/tryon guest fallback requires explicit opt-in, not silent upsert

**API Key / Secrets:**
- [ ] TNB API key moved from query param to Authorization/X-API-Key header
- [ ] All provider credentials (TNB, OpenAI, R2, Supabase) never logged
- [ ] Log sanitization utility applied to all API routes

**Upload Security:**
- [ ] Magic bytes validation (not just file.type) for image uploads
- [ ] Strict MIME allowlist: image/jpeg, image/png, image/webp, image/gif only
- [ ] File size limit enforced at 10MB (already present, verify consistency)
- [ ] Filename sanitization (path traversal prevention)

**Deployment Infrastructure:**
- [ ] Dockerfile for frontend (Next.js)
- [ ] Dockerfile for backend (FastAPI/Python)
- [ ] docker-compose.dev.yml for local development
- [ ] Production environment template (.env.production.example)
- [ ] Startup validation script (checks all required env vars)

**CI/CD:**
- [ ] GitHub Actions: lint workflow
- [ ] GitHub Actions: typecheck workflow
- [ ] GitHub Actions: test workflow (vitest + pytest)
- [ ] GitHub Actions: build verification workflow
- [ ] GitHub Actions: deployment validation (no auto-deploy)

**Observability:**
- [ ] Sentry integrated (frontend + backend)
- [ ] Structured logging (replace console.log with structured logger)
- [ ] Request tracing headers (x-request-id)
- [ ] AI provider error logging (TNB, OpenAI failures traceable)
- [ ] Route error logging with context

**Documentation / Audit Output:**
- [ ] Security audit report (SECURITY-AUDIT.md)
- [ ] Infrastructure architecture report (INFRA-ARCH.md)
- [ ] Deployment guide (DEPLOY.md)
- [ ] Environment requirements reference (ENV-REQUIREMENTS.md)
- [ ] Rollback strategy (ROLLBACK.md)

### Out of Scope

- Auto-deploy pipelines — CI/CD verifies but does not deploy (security milestone only)
- New product features — hardening only, no new user-facing functionality
- Supabase schema migrations — auth model unchanged
- Frontend UI changes — no visual changes

## Context

**Stack:** Next.js 15 App Router, React 19, FastAPI, TypeScript, Python 3.x, Supabase (Postgres + Auth + Storage), Cloudflare R2, Vercel deployment.

**Existing security posture (pre-hardening):**
- CRITICAL: /api/proxy has full SSRF — any URL fetched with no validation
- CRITICAL: /api/keys/validate returns valid:true with no key (demo bypass)
- CRITICAL: TNB_API_KEY leaked in URL query params on every try-on call
- CRITICAL: INTERNAL_SERVICE_TOKEN unset = silent auth bypass in Python backend
- HIGH: Upload MIME check trusts user-controlled file.type (no magic bytes)
- HIGH: Guest auth in tryon/route.ts silently upserts any userId as valid user
- MISSING: No Dockerfiles, no CI/CD, no Sentry, no structured logging

**Allowlisted image domains (image-hosts.config.mjs):**
images.unsplash.com, images.pexels.com, images.pixabay.com, img.rocket.new, *.supabase.co, *.r2.cloudflarestorage.com, thenewblack.ai, *.thenewblack.ai

**Key files:**
- `frontend/src/app/api/proxy/route.ts` — SSRF vector
- `frontend/src/app/api/keys/validate/route.ts` — auth bypass
- `frontend/src/app/api/tryon/route.ts` — key leakage + guest auth
- `backend/main.py` — silent token bypass
- `frontend/src/app/api/upload/route.ts` — weak MIME validation
- `frontend/image-hosts.config.mjs` — allowlist source of truth

## Constraints

- **Compatibility**: Must not break /api/tryon, /api/upload, /api/avatar/generate, /api/proxy image flows
- **No secrets in code**: All credentials via environment variables only
- **No auto-deploy**: CI/CD pipelines verify only — no production push automation
- **Python service**: Must remain compatible with Next.js proxy calls using INTERNAL_SERVICE_TOKEN Bearer auth

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use image-hosts.config.mjs as SSRF allowlist source | Single source of truth, already maintained | — Pending |
| Move TNB key to X-API-Key header | URLs logged everywhere; headers are not | — Pending |
| Hard fail on missing INTERNAL_SERVICE_TOKEN in prod | Silent bypass = full auth defeat | — Pending |
| Magic bytes via file-type library | file.type is user-controlled, untrustworthy | — Pending |
| Sentry for both frontend and backend | Unified error tracking across the stack | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-14 after initialization*
