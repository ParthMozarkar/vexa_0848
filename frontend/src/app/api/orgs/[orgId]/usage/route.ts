/**
 * GET /api/orgs/[orgId]/usage
 * Returns quota status and recent usage logs for a given org.
 * Protected by VEXA_ADMIN_KEY — internal/ops use only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminKey } from '@/lib/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
): Promise<NextResponse> {
  const adminCheck = requireAdminKey(req);
  if (adminCheck) return adminCheck;

  const { orgId } = await params;
  const supabase = createServerSupabaseClient();

  const [quotaResult, usageResult] = await Promise.all([
    supabase.from('tenant_quotas').select('*').eq('org_id', orgId).single(),
    supabase
      .from('usage_logs')
      .select('endpoint, status, response_time_ms, timestamp')
      .eq('org_id', orgId)
      .order('timestamp', { ascending: false })
      .limit(100),
  ]);

  return NextResponse.json({
    orgId,
    quota: quotaResult.data ?? null,
    recentUsage: usageResult.data ?? [],
  });
}
