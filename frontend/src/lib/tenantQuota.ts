/**
 * tenantQuota.ts
 * Per-tenant quota enforcement — checks and increments DB-backed usage counters.
 * No quota row = unlimited (org not yet quota-configured).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: 'daily_limit' | 'monthly_limit';
  dailyUsed?: number;
  dailyLimit?: number;
  monthlyUsed?: number;
  monthlyLimit?: number;
}

export async function checkTenantQuota(
  orgId: string,
  supabase: SupabaseClient,
): Promise<QuotaCheckResult> {
  const { data, error } = await supabase
    .from('tenant_quotas')
    .select('daily_ai_limit, monthly_ai_limit, daily_used, monthly_used')
    .eq('org_id', orgId)
    .single();

  if (error || !data) {
    // No quota row = unlimited (org not yet quota-configured)
    return { allowed: true };
  }

  if (data.daily_used >= data.daily_ai_limit) {
    return {
      allowed: false,
      reason: 'daily_limit',
      dailyUsed: data.daily_used,
      dailyLimit: data.daily_ai_limit,
    };
  }

  if (data.monthly_used >= data.monthly_ai_limit) {
    return {
      allowed: false,
      reason: 'monthly_limit',
      monthlyUsed: data.monthly_used,
      monthlyLimit: data.monthly_ai_limit,
    };
  }

  return {
    allowed: true,
    dailyUsed: data.daily_used,
    dailyLimit: data.daily_ai_limit,
    monthlyUsed: data.monthly_used,
    monthlyLimit: data.monthly_ai_limit,
  };
}

export async function incrementTenantQuota(
  orgId: string,
  supabase: SupabaseClient,
): Promise<void> {
  await supabase.rpc('increment_tenant_quota', { p_org_id: orgId }).throwOnError();
}
