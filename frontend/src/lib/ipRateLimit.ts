import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import type { IpTryOnLimitRow } from '@/types/database'

const MAX_GENERATIONS_PER_IP = 2

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env missing')
  return createClient(url, key, { auth: { persistSession: false } })
}

export function getClientIp(req: NextRequest): string {
  const xForwardedFor = req.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0].trim()
    if (firstIp) return firstIp
  }

  const xRealIp = req.headers.get('x-real-ip')
  if (xRealIp) return xRealIp.trim()

  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp.trim()

  return 'unknown'
}

export interface IpCheckResult {
  allowed: boolean
  generationsUsed: number
  generationsRemaining: number
  isNewIp: boolean
}

export async function checkIpLimit(ip: string): Promise<IpCheckResult> {
  if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
    if (process.env.NODE_ENV === 'development') {
      return {
        allowed: true,
        generationsUsed: 0,
        generationsRemaining: MAX_GENERATIONS_PER_IP,
        isNewIp: true,
      }
    }
  }

  const supabase = getServiceSupabase()

  const { data: existing } = await supabase
    .from('ip_tryon_limits')
    .select('generation_count')
    .eq('ip_address', ip)
    .single() as { data: Pick<IpTryOnLimitRow, 'generation_count'> | null }

  const currentCount = existing?.generation_count ?? 0
  const remaining = MAX_GENERATIONS_PER_IP - currentCount

  return {
    allowed: currentCount < MAX_GENERATIONS_PER_IP,
    generationsUsed: currentCount,
    generationsRemaining: Math.max(0, remaining),
    isNewIp: !existing,
  }
}

export async function incrementIpCount(ip: string): Promise<void> {
  if (ip === 'unknown') return
  if (process.env.NODE_ENV === 'development' && (ip === '::1' || ip === '127.0.0.1')) return

  const supabase = getServiceSupabase()

  const { data: existing } = await supabase
    .from('ip_tryon_limits')
    .select('id, generation_count')
    .eq('ip_address', ip)
    .single() as { data: Pick<IpTryOnLimitRow, 'id' | 'generation_count'> | null }

  if (existing) {
    await supabase
      .from('ip_tryon_limits')
      .update({
        generation_count: existing.generation_count + 1,
        last_used_at: new Date().toISOString(),
      } satisfies Partial<IpTryOnLimitRow>)
      .eq('ip_address', ip)
  } else {
    await supabase
      .from('ip_tryon_limits')
      .insert({
        ip_address: ip,
        generation_count: 1,
      } satisfies Omit<IpTryOnLimitRow, 'id' | 'first_used_at' | 'last_used_at'>)
  }
}
