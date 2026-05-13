import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const MAX_TRYON = 2
const MAX_DESIGN = 3

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env missing')
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Robust IP detection
 */
export function getClientIp(req: NextRequest): string {
  const xForwardedFor = req.headers.get('x-forwarded-for')
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim()
  
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()

  return '127.0.0.1'
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  generationsRemaining: number
}

/**
 * Checks if the IP is within its 24h limit for a specific type
 */
export async function checkIpLimit(ip: string, type: 'tryon' | 'design' = 'tryon'): Promise<RateLimitResult> {
  const whitelist = (process.env.WHITELISTED_IPS || '').split(',').map(i => i.trim());
  
  // 1. Bypass for whitelist or localhost
  if (whitelist.includes(ip) || ip === '127.0.0.1' || ip === '::1' || ip === 'unknown') {
    return { allowed: true, remaining: 99, generationsRemaining: 99 }
  }

  const supabase = getServiceSupabase()
  const limit = type === 'tryon' ? MAX_TRYON : MAX_DESIGN

  // 2. Fetch record from our new table
  const { data, error } = await supabase
    .from('ip_usage_limits')
    .select('count, last_reset')
    .eq('ip_address', ip)
    .eq('usage_type', type)
    .single()

  const now = new Date()

  if (data) {
    const lastReset = new Date(data.last_reset)
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60)

    // 3. Handle 24h Reset
    if (hoursSinceReset >= 24) {
      await supabase.from('ip_usage_limits').update({ 
        count: 0, 
        last_reset: now.toISOString() 
      }).eq('ip_address', ip).eq('usage_type', type)
      
      return { allowed: true, remaining: limit, generationsRemaining: limit }
    }

    // 4. Check Count
    const rem = Math.max(0, limit - data.count)
    return {
      allowed: data.count < limit,
      remaining: rem,
      generationsRemaining: rem
    }
  }

  // 5. New IP: Create record
  await supabase.from('ip_usage_limits').insert({
    ip_address: ip,
    usage_type: type,
    count: 0,
    last_reset: now.toISOString()
  })

  return { allowed: true, remaining: limit, generationsRemaining: limit }
}

/**
 * Increment count after a SUCCESSFUL generation
 */
export async function incrementIpCount(ip: string, type: 'tryon' | 'design' = 'tryon'): Promise<void> {
  const whitelist = (process.env.WHITELISTED_IPS || '').split(',').map(i => i.trim());
  if (whitelist.includes(ip) || ip === '127.0.0.1' || ip === '::1') return

  const supabase = getServiceSupabase()
  
  const { data } = await supabase
    .from('ip_usage_limits')
    .select('count')
    .eq('ip_address', ip)
    .eq('usage_type', type)
    .single()

  if (data) {
    await supabase.from('ip_usage_limits')
      .update({ count: data.count + 1 })
      .eq('ip_address', ip)
      .eq('usage_type', type)
  }
}
