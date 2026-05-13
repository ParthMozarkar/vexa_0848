---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: AI Infrastructure Scale
status: planning
last_updated: "2026-05-13T22:14:49.048Z"
last_activity: 2026-05-13
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# VEXA Production Security Hardening — Project State

**Last updated:** 2026-05-14
**Milestone:** v1.0 Security Hardening

---

## Project Reference

**Core Value:** Zero-regression security hardening — every critical vulnerability closed without breaking the working try-on, avatar, upload, and marketplace flows.

**Current Focus:** Phase 1 — SSRF Prevention

---

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-13 — Milestone v2.0 started

## Performance Metrics

| Metric | Value |
|--------|-------|
| Requirements total | 39 |
| Requirements complete | 0 |
| Phases complete | 0/8 |
| Plans complete | 0 |
| Blockers | None |

---

## Accumulated Context

### Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use image-hosts.config.mjs as SSRF allowlist source | Single source of truth, already maintained |
| Move TNB key to X-API-Key header | URLs logged everywhere; headers are not |
| Hard fail on missing INTERNAL_SERVICE_TOKEN in prod | Silent bypass = full auth defeat |
| Magic bytes via file-type library | file.type is user-controlled, untrustworthy |
| Sentry for both frontend and backend | Unified error tracking across the stack |

### Critical Files to Know

| File | Why It Matters |
|------|----------------|
| frontend/src/app/api/proxy/route.ts | Primary SSRF vector — Phase 1 target |
| frontend/src/app/api/keys/validate/route.ts | Demo bypass — Phase 2 target |
| frontend/src/app/api/tryon/route.ts | Key leakage + guest auth — Phase 2/3 target |
| backend/main.py | Silent token bypass — Phase 2 target |
| frontend/src/app/api/upload/route.ts | Weak MIME validation — Phase 4 target |
| frontend/image-hosts.config.mjs | SSRF allowlist source of truth |

### Compatibility Constraints

- Must not break /api/tryon, /api/upload, /api/avatar/generate, /api/proxy image flows
- No secrets in code — all credentials via environment variables only
- No auto-deploy — CI/CD verifies only, no production push automation
- Python service must remain compatible with Next.js proxy calls using INTERNAL_SERVICE_TOKEN Bearer auth

### Todos

- [ ] Begin Phase 1: audit proxy/route.ts and implement allowlist + scheme + IP validation
- [ ] Identify all fetch(url) patterns with user-controlled input in the codebase

### Blockers

None currently.

---

## Session Continuity

**To resume this project:**

1. Read this STATE.md for current position
2. Read ROADMAP.md for phase goals and success criteria
3. Read REQUIREMENTS.md for detailed requirement specifications
4. Read codebase/CONCERNS.md for vulnerability details and file references
5. Start with Phase 1: SSRF Prevention — target file is frontend/src/app/api/proxy/route.ts

**Next action:** `/gsd-plan-phase 1`

---

*State initialized: 2026-05-14*
