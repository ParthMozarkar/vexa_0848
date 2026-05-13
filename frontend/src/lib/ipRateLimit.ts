import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

const MAX_TRYON = 2;
const MAX_DESIGN = 3;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Alias for `remaining` — used by `/api/tryon` JSON responses */
  generationsRemaining: number;
}

function withGenerations(r: Omit<RateLimitResult, 'generationsRemaining'>): RateLimitResult {
  return { ...r, generationsRemaining: r.remaining };
}

/**
 * Robust IP detection
 */
export function getClientIp(req: NextRequest): string {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();

  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();

  return '127.0.0.1';
}

/**
 * Checks if the IP is within its 24h limit for a specific type
 */
export async function checkIpLimit(
  ip: string,
  type: 'tryon' | 'design' = 'tryon',
): Promise<RateLimitResult> {
  const whitelist = (process.env.WHITELISTED_IPS || '')
    .split(',')
    .map((i) => i.trim());

  if (whitelist.includes(ip) || ip === '127.0.0.1' || ip === '::1' || ip === 'unknown') {
    return withGenerations({ allowed: true, remaining: 99 });
  }

  const supabase = createServerSupabaseClient();
  const limit = type === 'tryon' ? MAX_TRYON : MAX_DESIGN;

  const { data, error } = await supabase
    .from('ip_usage_limits')
    .select('count, last_reset')
    .eq('ip_address', ip)
    .eq('usage_type', type)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[ipRateLimit] DB error:', error.message);
    return withGenerations({ allowed: true, remaining: 1 });
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

      return withGenerations({ allowed: true, remaining: limit });
    }

    return withGenerations({
      allowed: data.count < limit,
      remaining: Math.max(0, limit - data.count),
    });
  }

  await supabase.from('ip_usage_limits').insert({
    ip_address: ip,
    usage_type: type,
    count: 0,
    last_reset: now.toISOString(),
  });

  return withGenerations({ allowed: true, remaining: limit });
}

/**
 * Increment count after a SUCCESSFUL generation
 */
export async function incrementIpCount(
  ip: string,
  type: 'tryon' | 'design' = 'tryon',
): Promise<void> {
  const whitelist = (process.env.WHITELISTED_IPS || '')
    .split(',')
    .map((i) => i.trim());
  if (whitelist.includes(ip) || ip === '127.0.0.1' || ip === '::1') return;

  const supabase = createServerSupabaseClient();

  const { data } = await supabase
    .from('ip_usage_limits')
    .select('count')
    .eq('ip_address', ip)
    .eq('usage_type', type)
    .maybeSingle();

  if (data) {
    await supabase
      .from('ip_usage_limits')
      .update({ count: data.count + 1 })
      .eq('ip_address', ip)
      .eq('usage_type', type);
  }
}
