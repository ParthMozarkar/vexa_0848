import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const MAX_TRYON_PER_24H = 2;
const MAX_DESIGN_PER_24H = 3;

/**
 * Helper to get the user's real IP address from headers
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return '127.0.0.1';
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Checks if the IP is allowed to perform a specific action (tryon or design)
 * @returns { isAllowed: boolean, remaining: number, resetInHours: number }
 */
export async function checkRateLimit(req: NextRequest, type: 'tryon' | 'design'): Promise<{ isAllowed: boolean; remaining: number }> {
  const ip = getClientIp(req);
  const whitelist = (process.env.WHITELISTED_IPS || '').split(',').map(i => i.trim());
  
  // 1. Whitelist Bypass (Demo Laptops)
  if (whitelist.includes(ip) || ip === '127.0.0.1' || ip === '::1') {
    return { isAllowed: true, remaining: 99 };
  }

  // 2. API Key Bypass (Premium Users)
  const vexaKey = req.headers.get('x-vexa-key');
  if (vexaKey) return { isAllowed: true, remaining: 999 };

  const supabase = getServiceSupabase();
  const limit = type === 'tryon' ? MAX_TRYON_PER_24H : MAX_DESIGN_PER_24H;

  // 3. Fetch current usage
  const { data, error } = await supabase
    .from('ip_usage_limits')
    .select('count, last_reset')
    .eq('ip_address', ip)
    .eq('usage_type', type)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('[RateLimit] DB Error:', error);
    return { isAllowed: true, remaining: 1 }; // Default to allowed on DB failure
  }

  const now = new Date();
  
  // 4. Handle 24h Reset
  if (data) {
    const lastReset = new Date(data.last_reset);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      // Reset count for new 24h window
      await supabase.from('ip_usage_limits').update({ 
        count: 0, 
        last_reset: now.toISOString() 
      }).eq('ip_address', ip).eq('usage_type', type);
      
      return { isAllowed: true, remaining: limit };
    }

    // 5. Check Limit
    if (data.count >= limit) {
      return { isAllowed: false, remaining: 0 };
    }

    return { isAllowed: true, remaining: limit - data.count };
  }

  // 6. First time user (create record)
  await supabase.from('ip_usage_limits').insert({
    ip_address: ip,
    usage_type: type,
    count: 0,
    last_reset: now.toISOString()
  });

  return { isAllowed: true, remaining: limit };
}

/**
 * Increments the usage count for an IP after a SUCCESSFUL generation
 */
export async function incrementRateLimit(req: NextRequest, type: 'tryon' | 'design') {
  const ip = getClientIp(req);
  const whitelist = (process.env.WHITELISTED_IPS || '').split(',').map(i => i.trim());
  if (whitelist.includes(ip)) return;
  if (req.headers.get('x-vexa-key')) return;

  const supabase = getServiceSupabase();
  
  // Use RPC or atomic update to prevent race conditions
  await supabase.rpc('increment_ip_usage', { 
    p_ip: ip, 
    p_type: type 
  });
  
  // Fallback if RPC isn't set up
  const { data } = await supabase
    .from('ip_usage_limits')
    .select('count')
    .eq('ip_address', ip)
    .eq('usage_type', type)
    .single();
    
  if (data) {
    await supabase
      .from('ip_usage_limits')
      .update({ count: data.count + 1 })
      .eq('ip_address', ip)
      .eq('usage_type', type);
  }
}
