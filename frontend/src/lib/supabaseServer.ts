import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getPublicSupabaseUrl, getServerSupabaseSecretKey } from '@/lib/env';

/**
 * Server-only Supabase client (service role in production; dev may use anon with warning).
 * Typed loosely (`any`) until Supabase CLI-generated types replace the hand-maintained schema.
 */
export function createServerSupabaseClient(): SupabaseClient {
  return createClient(getPublicSupabaseUrl(), getServerSupabaseSecretKey(), {
    auth: { persistSession: false },
  });
}
