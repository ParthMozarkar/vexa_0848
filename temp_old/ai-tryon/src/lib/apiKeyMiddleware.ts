import type { MarketplaceContext } from '@/types';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function validateApiKey(key: string): Promise<MarketplaceContext | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Hash the incoming key
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    // 2. Query for active key
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, marketplace_name, monthly_limit, call_count')
      .eq('key_hash', keyHash)
      .eq('status', 'active')
      .single();

    if (error || !data) return null;

    // 3. Update last_used_at and increment call_count atomically
    await supabase.rpc('increment_api_key_usage', { key_id: data.id });
    // Alternative if RPC not available yet:
    // await supabase.from('api_keys').update({ 
    //   last_used_at: new Date().toISOString(), 
    //   call_count: (data.call_count || 0) + 1 
    // }).eq('id', data.id);

    return {
      api_key_id: data.id,
      marketplace_name: data.marketplace_name,
      monthly_limit: data.monthly_limit || 0,
      calls_this_month: (data.call_count || 0) + 1,
    };
  } catch (error) {
    console.error('validateApiKey error:', error);
    return null;
  }
}

export async function logApiUsage(
  apiKeyId: string,
  endpoint: string,
  statusCode: number
): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('usage_logs').insert({
      api_key_id: apiKeyId,
      endpoint: endpoint,
      status_code: statusCode,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Silent fail
    console.error('logApiUsage error (silently failing):', error);
  }
}
