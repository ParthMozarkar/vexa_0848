import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

const MAX_TRYON_PER_24H = 2;
const MAX_DESIGN_PER_24H = 3;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return '127.0.0.1';
}

/**
 * Checks if the IP is allowed to perform a specific action (tryon or design)
 */
export async function checkRateLimit(
  req: NextRequest,
  type: 'tryon' | 'design',
): Promise<{ isAllowed: boolean; remaining: number }> {
  const ip = getClientIp(req);
  const whitelist = (process.env.WHITELISTED_IPS || '')
    .split(',')
    .map((i) => i.trim());

  if (whitelist.includes(ip) || ip === '127.0.0.1' || ip === '::1') {
    return { isAllowed: true, remaining: 99 };
  }

  const vexaKey = req.headers.get('x-vexa-key');
  if (vexaKey) return { isAllowed: true, remaining: 999 };

  const supabase = createServerSupabaseClient();
  const limit = type === 'tryon' ? MAX_TRYON_PER_24H : MAX_DESIGN_PER_24H;

  const { data, error } = await supabase
    .from('ip_usage_limits')
    .select('count, last_reset')
    .eq('ip_address', ip)
    .eq('usage_type', type)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[RateLimit] DB Error:', error);
    return { isAllowed: true, remaining: 1 };
  }

  const now = new Date();

  if (data) {
    const lastReset = new Date(data.last_reset);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
      await supabase
        .from('ip_usage_limits')
        .update({
          count: 0,
          last_reset: now.toISOString(),
        })
        .eq('ip_address', ip)
        .eq('usage_type', type);

      return { isAllowed: true, remaining: limit };
    }

    if (data.count >= limit) {
      return { isAllowed: false, remaining: 0 };
    }

    return { isAllowed: true, remaining: limit - data.count };
  }

  await supabase.from('ip_usage_limits').insert({
    ip_address: ip,
    usage_type: type,
    count: 0,
    last_reset: now.toISOString(),
  });

  return { isAllowed: true, remaining: limit };
}

/**
 * Increments the usage count for an IP after a SUCCESSFUL generation
 */
export async function incrementRateLimit(req: NextRequest, type: 'tryon' | 'design') {
  const ip = getClientIp(req);
  const whitelist = (process.env.WHITELISTED_IPS || '')
    .split(',')
    .map((i) => i.trim());
  if (whitelist.includes(ip)) return;
  if (req.headers.get('x-vexa-key')) return;

  const supabase = createServerSupabaseClient();

  try {
    const { error } = await supabase.rpc('increment_ip_usage', {
      p_ip: ip,
      p_type: type,
    });
    if (!error) return;
    console.warn('[RateLimit] increment_ip_usage RPC unavailable:', error.message);
  } catch (e) {
    console.warn('[RateLimit] increment_ip_usage RPC threw:', e);
  }

  const { data } = await supabase
    .from('ip_usage_limits')
    .select('count')
    .eq('ip_address', ip)
    .eq('usage_type', type)
    .maybeSingle();

  if (data) {
    await supabase
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
}

const batchWindowMs = 60_000;
const batchHitTimestamps = new Map<string, number[]>();

/**
 * Short-window flood guard for batch try-on (default max 10 hits / minute / IP, in-process).
 * On serverless this is best-effort per instance.
 */
export async function isRateLimited(ip: string, maxPerWindow: number): Promise<boolean> {
  const now = Date.now();
  const prev = (batchHitTimestamps.get(ip) || []).filter((t) => now - t < batchWindowMs);
  prev.push(now);
  batchHitTimestamps.set(ip, prev);
  return prev.length > maxPerWindow;
}
