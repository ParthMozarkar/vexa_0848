import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { requireAdminKey } from '@/lib/adminAuth';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const adminCheck = requireAdminKey(req);
  if (adminCheck) return adminCheck;

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId');
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7); // YYYY-MM

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('usage_events')
    .select('org_id, unit, cost_usd, duration_ms, status, timestamp')
    .gte('timestamp', `${month}-01T00:00:00Z`)
    .lt('timestamp', `${month}-31T23:59:59Z`);

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = data ?? [];
  const totalCostUsd = events.reduce((sum, e) => sum + (e.cost_usd ?? 0), 0);
  const totalGenerations = events.length;
  const byUnit = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.unit] = (acc[e.unit] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    month,
    orgId: orgId ?? 'all',
    totalGenerations,
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    byUnit,
    // Stripe-compatible metered billing shape
    stripeUsageRecords: events.map(e => ({
      org_id: e.org_id,
      quantity: 1,
      unit: e.unit,
      timestamp: e.timestamp,
    })),
  });
}
