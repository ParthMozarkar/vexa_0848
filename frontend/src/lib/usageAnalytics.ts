// Usage analytics event emitter — structured metered events for billing.
// Stripe-compatible schema: org_id, quantity, unit, timestamp.
import { logger } from './logger';

export type GenerationUnit = 'tryon' | 'avatar' | 'design' | 'model-gen' | 'video-tryon';

export interface UsageEvent {
  orgId: string | null;
  userId: string | null;
  provider: string;
  endpoint: string;
  unit: GenerationUnit;
  quantity: number; // always 1 per generation
  costUsd: number;
  durationMs: number;
  status: 'success' | 'failed';
  timestamp: string;
  // Stripe-compatible fields
  stripeMeterId?: string;
  idempotencyKey?: string;
}

// In-memory buffer — flush to DB via Supabase in the caller
// Keep emitter side-effect free; caller decides persistence
export function createUsageEvent(
  partial: Omit<UsageEvent, 'timestamp' | 'quantity'> & { quantity?: number },
): UsageEvent {
  return {
    ...partial,
    quantity: partial.quantity ?? 1,
    timestamp: new Date().toISOString(),
  };
}

export function logUsageEvent(event: UsageEvent): void {
  logger.info('[UsageAnalytics]', {
    orgId: event.orgId,
    userId: event.userId,
    provider: event.provider,
    unit: event.unit,
    costUsd: event.costUsd,
    durationMs: event.durationMs,
    status: event.status,
    timestamp: event.timestamp,
  });
}

// Emit 80% budget warning
export function checkBudgetAlert(
  monthlyUsedUsd: number,
  monthlyCeilingUsd: number,
  orgId: string | null,
): void {
  if (monthlyCeilingUsd <= 0) return;
  const pct = monthlyUsedUsd / monthlyCeilingUsd;
  if (pct >= 0.8) {
    logger.warn('[BudgetAlert] Org approaching monthly limit', {
      orgId,
      currentSpendUsd: monthlyUsedUsd,
      ceilingUsd: monthlyCeilingUsd,
      percentUsed: Math.round(pct * 100),
    });
  }
}
