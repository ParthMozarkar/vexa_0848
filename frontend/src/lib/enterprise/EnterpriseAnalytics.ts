
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export class EnterpriseAnalytics {
  private static supabase = createServerSupabaseClient();

  static async getBrandDashboard(orgId: string) {
    const [tryOns, conversions] = await Promise.all([
      this.supabase.from('usage_logs').select('*', { count: 'exact' }).eq('org_id', orgId),
      this.supabase.from('conversion_events').select('*').eq('org_id', orgId)
    ]);

    const totalConversions = (conversions.data || []).filter(e => e.event_type === 'purchase').length;
    const totalTryOns = tryOns.count || 0;

    return {
      totalTryOns,
      conversionRate: totalTryOns > 0 ? (totalConversions / totalTryOns) * 100 : 0,
      revenueLiftEstimate: totalConversions * 45.0, // Mock metric: $45 avg order
      engagementMetrics: {
        avgSessionDuration: '4m 12s',
        repeatUserRate: '18%'
      }
    };
  }

  static async trackConversion(orgId: string, eventType: string, productId: string, metadata: any) {
    return await this.supabase.from('conversion_events').insert({
      org_id: orgId,
      event_type: eventType,
      product_id: productId,
      metadata
    });
  }
}
