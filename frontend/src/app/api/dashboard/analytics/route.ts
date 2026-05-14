import { NextRequest, NextResponse } from 'next/server';
import { hashApiKey } from '@/lib/crypto';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const marketplaceKey = req.nextUrl.searchParams.get('marketplaceKey');
    const orgId = req.nextUrl.searchParams.get('orgId');

    const supabase = createServerSupabaseClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimit = thirtyDaysAgo.toISOString();

    // Usage logs
    let usageQuery = supabase
      .from('usage_logs')
      .select('*')
      .gte('timestamp', dateLimit);

    // Tryon results
    let tryonQuery = supabase
      .from('tryon_results')
      .select('id, product_id, created_at')
      .gte('created_at', dateLimit);

    if (marketplaceKey) {
      // Need to find api_key_id first
      const hashedKey = await hashApiKey(marketplaceKey);
      const { data: keyRecord } = await supabase.from('api_keys').select('id').eq('key_hash', hashedKey).single();
      if (keyRecord) {
        usageQuery = usageQuery.eq('api_key_id', keyRecord.id);
        // Note: For try_on if we had marketplace_id we'd filter, but skipping for now or assume filtering.
      }
    }

    // Org-scoped breakdown: filter usage_logs by org_id when provided
    if (orgId) {
      usageQuery = usageQuery.eq('org_id', orgId);
    }

    const [usageRes, tryonRes] = await Promise.all([
      usageQuery,
      tryonQuery
    ]);

    const usageLogs = usageRes.data || [];
    const tryonRecords = tryonRes.data || [];

    // 1. Success Rate
    const totalLogs = usageLogs.length;
    const successLogs = usageLogs.filter(log => log.status === 200).length;
    const successRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 100;

    // 2. Average Response Time
    const responseTimes = usageLogs.map(log => log.response_time_ms || 0);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    // 3. Top 5 Products
    const productCounts: Record<string, number> = {};
    tryonRecords.forEach(tr => {
      const pid = tr.product_id || 'unknown';
      productCounts[pid] = (productCounts[pid] || 0) + 1;
    });
    const topProducts = Object.entries(productCounts)
      .map(([id, count]) => ({ id, name: id.replace('prod_', 'Product ').toUpperCase(), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Daily Try-on Volume (last 30 days)
    const dailyVolumeMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        dailyVolumeMap[dayStr] = 0;
    }

    tryonRecords.forEach(tr => {
       const dStr = new Date(tr.created_at).toISOString().split('T')[0];
       if (dailyVolumeMap[dStr] !== undefined) {
           dailyVolumeMap[dStr]++;
       }
    });

    const dailyVolume = Object.entries(dailyVolumeMap).map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      successRate,
      avgResponseTime,
      topProducts,
      dailyVolume
    });

  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

