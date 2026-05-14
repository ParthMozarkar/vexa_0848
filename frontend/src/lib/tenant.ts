/**
 * tenant.ts
 * Tenant context resolution — resolves org_id from multiple sources.
 * Priority: x-vexa-key (marketplace) → Bearer JWT (user) → null (unauthenticated/demo)
 * Extends marketplace_id pattern; never breaks unauthenticated demo flows.
 */

import type { NextRequest } from 'next/server';

export interface TenantContext {
  orgId: string | null;
  marketplaceId: string | null;
  userId: string | null;
  quotaKey: string; // used as rate-limit key: orgId ?? userId ?? ip
}

export function resolveTenantContext(
  req: NextRequest,
  opts?: { marketplaceId?: string | null; userId?: string | null },
): TenantContext {
  const marketplaceId = opts?.marketplaceId ?? null;
  const userId = opts?.userId ?? null;
  // org_id is marketplace_id for B2B clients (one-to-one in current model)
  // future: org_id can encompass multiple marketplace_ids
  const orgId = marketplaceId ?? null;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const quotaKey = orgId ?? userId ?? ip;
  return { orgId, marketplaceId, userId, quotaKey };
}

export function isTenantRequest(ctx: TenantContext): boolean {
  return ctx.orgId !== null;
}
