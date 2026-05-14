# VEXA Enterprise Scale — Requirements

**Milestone:** v4.0 Enterprise Scale
**Status:** Active

---

## v4.0 Requirements

### Multi-Tenant Architecture (Task 1)

- [ ] **MT-01**: `frontend/src/lib/tenant.ts` — tenant context resolution (org_id from JWT, x-vexa-key, or subdomain)
- [ ] **MT-02**: `frontend/src/types/database.ts` extended — OrganizationRow, OrgMemberRow, TenantQuotaRow types
- [ ] **MT-03**: Tenant isolation in API routes — all DB queries scoped to org_id
- [ ] **MT-04**: Per-tenant rate limits (overrides global IP limits when org_id present)
- [ ] **MT-05**: Per-tenant AI call quotas (daily + monthly ceiling, configurable per org)
- [ ] **MT-06**: Tenant-aware provider registry — orgs can have custom provider priority
- [ ] **MT-07**: `GET /api/orgs/[orgId]/usage` — tenant usage summary endpoint

### Analytics + Billing (Task 2)

- [ ] **BILL-01**: `frontend/src/lib/usageAnalytics.ts` — event emitter for generation events (provider, cost, userId, orgId, endpoint)
- [ ] **BILL-02**: Metered usage stored in `usage_events` table (provider, cost_usd, tokens, duration_ms, org_id)
- [ ] **BILL-03**: `GET /api/dashboard/analytics` extended — per-org breakdowns, cost totals, generation counts
- [ ] **BILL-04**: `GET /api/billing/summary` — monthly usage + estimated cost per org
- [ ] **BILL-05**: Cost alert threshold — emit warning when org exceeds 80% of monthly budget
- [ ] **BILL-06**: Billing-ready event schema (stripe-compatible: org_id, quantity, unit, timestamp)

### Admin Systems (Task 3)

- [ ] **ADMIN-01**: `GET /api/admin/providers` — health + latency of all registered AI providers
- [ ] **ADMIN-02**: `GET /api/admin/queues` — BullMQ queue depths, active/waiting/failed counts per queue
- [ ] **ADMIN-03**: `GET /api/admin/failures` — recent failed jobs with error, provider, userId, timestamp
- [ ] **ADMIN-04**: `frontend/src/lib/adminAuth.ts` — VEXA_ADMIN_KEY guard for all /api/admin/* routes
- [ ] **ADMIN-05**: `GET /api/admin/orgs` — list orgs with usage, quota status, key count
- [ ] **ADMIN-06**: Admin dashboard data types in `frontend/src/types/admin.ts`

### Infra Scaling Design (Task 4)

- [ ] **SCALE-01**: `docs/WORKER-SCALING.md` — horizontal worker scaling guide (BullMQ multi-instance, concurrency tuning)
- [ ] **SCALE-02**: `docs/GPU-SCALING.md` — Python backend GPU scaling (CUDA workers, queue-based dispatch, spot instances)
- [ ] **SCALE-03**: `docs/CDN-STRATEGY.md` — CDN layer for R2 assets, signed URL caching, edge cache rules
- [ ] **SCALE-04**: `docs/STORAGE-STRATEGY.md` — R2 lifecycle policies, cold storage tiering, deduplication at scale
- [ ] **SCALE-05**: `docs/CACHING-LAYERS.md` — full caching topology (edge, Redis, in-memory LRU, CDN)
- [ ] **SCALE-06**: `frontend/src/lib/scalingConfig.ts` — runtime scaling knobs (worker counts, cache TTLs, queue depths)

### Enterprise Hardening (Task 5)

- [ ] **HARD-01**: `frontend/src/lib/auditLog.ts` — structured audit events (actor, action, resource, outcome, timestamp, ip)
- [ ] **HARD-02**: Audit logging wired into: key generation, key revocation, avatar generation, try-on, org creation
- [ ] **HARD-03**: `frontend/src/lib/compliance.ts` — PII field list, data retention policy constants, GDPR delete helper
- [ ] **HARD-04**: `GET /api/user/delete` already exists — audit log entry on deletion
- [ ] **HARD-05**: `frontend/src/lib/slaMonitor.ts` — SLA target constants (uptime, latency p99, error rate), health check aggregator
- [ ] **HARD-06**: `docs/BACKUP-STRATEGY.md` — Supabase backup schedule, R2 versioning, Redis persistence, recovery RTO/RPO

### Enterprise Documentation (Task 6)

- [ ] **DOC-E01**: `docs/ENTERPRISE-ARCH.md` — multi-tenant architecture diagram, org isolation model, data boundaries
- [ ] **DOC-E02**: `docs/ONBOARDING.md` — new developer onboarding guide (setup, env vars, first API call, testing)
- [ ] **DOC-E03**: `docs/PROVIDER-INTEGRATION.md` — how to add new AI providers (interface, registry, worker, cost config)
- [ ] **DOC-E04**: `docs/EMERGENCY-RECOVERY.md` — runbook for: provider outage, Redis failure, DB failure, R2 outage
- [ ] **DOC-E05**: `docs/SLA-ARCHITECTURE.md` — SLA commitments, health check endpoints, alerting thresholds, on-call guide

### Enterprise Output (Task 7)

- [ ] **OUT-01**: `docs/ENTERPRISE-READINESS.md` — scorecard across: security, scalability, compliance, observability, reliability
- [ ] **OUT-02**: `docs/SCALING-ROADMAP.md` — phased scaling plan from current → 10k/100k/1M daily requests
- [ ] **OUT-03**: `docs/INFRA-TOPOLOGY.md` — full infrastructure topology diagram (all services, networks, data flows)
- [ ] **OUT-04**: `docs/MIGRATION-STRATEGY.md` — future migration paths (DB sharding, microservices split, multi-region)

---

## Future Requirements (Deferred)

- Stripe billing integration (actual payment processing)
- Multi-region deployment (Vercel regions + distributed Redis)
- SOC2 Type II audit preparation
- Custom domain per tenant
- Tenant-scoped Sentry projects

---

## Out of Scope

- Changing existing user-facing API shapes
- Moving to microservices (design only, no migration in this milestone)
- Self-hosted LLM inference
- Payment processing implementation

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| MT-01 | Phase 21: Multi-Tenant Architecture | Pending |
| MT-02 | Phase 21: Multi-Tenant Architecture | Pending |
| MT-03 | Phase 21: Multi-Tenant Architecture | Pending |
| MT-04 | Phase 21: Multi-Tenant Architecture | Pending |
| MT-05 | Phase 21: Multi-Tenant Architecture | Pending |
| MT-06 | Phase 21: Multi-Tenant Architecture | Pending |
| MT-07 | Phase 21: Multi-Tenant Architecture | Pending |
| BILL-01 | Phase 22: Analytics + Billing | Pending |
| BILL-02 | Phase 22: Analytics + Billing | Pending |
| BILL-03 | Phase 22: Analytics + Billing | Pending |
| BILL-04 | Phase 22: Analytics + Billing | Pending |
| BILL-05 | Phase 22: Analytics + Billing | Pending |
| BILL-06 | Phase 22: Analytics + Billing | Pending |
| ADMIN-01 | Phase 23: Admin Systems | Pending |
| ADMIN-02 | Phase 23: Admin Systems | Pending |
| ADMIN-03 | Phase 23: Admin Systems | Pending |
| ADMIN-04 | Phase 23: Admin Systems | Pending |
| ADMIN-05 | Phase 23: Admin Systems | Pending |
| ADMIN-06 | Phase 23: Admin Systems | Pending |
| SCALE-01 | Phase 24: Infra Scaling Design | Pending |
| SCALE-02 | Phase 24: Infra Scaling Design | Pending |
| SCALE-03 | Phase 24: Infra Scaling Design | Pending |
| SCALE-04 | Phase 24: Infra Scaling Design | Pending |
| SCALE-05 | Phase 24: Infra Scaling Design | Pending |
| SCALE-06 | Phase 24: Infra Scaling Design | Pending |
| HARD-01 | Phase 25: Enterprise Hardening | Pending |
| HARD-02 | Phase 25: Enterprise Hardening | Pending |
| HARD-03 | Phase 25: Enterprise Hardening | Pending |
| HARD-04 | Phase 25: Enterprise Hardening | Pending |
| HARD-05 | Phase 25: Enterprise Hardening | Pending |
| HARD-06 | Phase 25: Enterprise Hardening | Pending |
| DOC-E01 | Phase 26: Enterprise Documentation | Pending |
| DOC-E02 | Phase 26: Enterprise Documentation | Pending |
| DOC-E03 | Phase 26: Enterprise Documentation | Pending |
| DOC-E04 | Phase 26: Enterprise Documentation | Pending |
| DOC-E05 | Phase 26: Enterprise Documentation | Pending |
| OUT-01 | Phase 27: Enterprise Output | Pending |
| OUT-02 | Phase 27: Enterprise Output | Pending |
| OUT-03 | Phase 27: Enterprise Output | Pending |
| OUT-04 | Phase 27: Enterprise Output | Pending |
