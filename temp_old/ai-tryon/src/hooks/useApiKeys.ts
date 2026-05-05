'use client'
import type { ApiKey } from '@/types'

export function useApiKeys() {
  // TODO: fetch api keys from Supabase for current marketplace account
  return {
    keys: [] as ApiKey[],
    isLoading: false,
    generateKey: async (_marketplaceName: string) => {},
    revokeKey: async (_keyId: string) => {},
  }
}
