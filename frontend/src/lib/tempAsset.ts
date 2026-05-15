/**
 * tempAsset — last-resort image hosting via Supabase DB.
 *
 * When both R2 and Supabase Storage are unavailable, image bytes are stored
 * in the `temp_assets` Postgres table and served by /api/serve/[id].
 * This guarantees TNB and other external AI APIs always receive an HTTP URL.
 *
 * Prerequisites: run supabase/migrations_safe/007_temp_assets.sql once.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

/** Base URL of the deployed app, used to build the /api/serve/[id] URL. */
function getAppBaseUrl(): string {
  // NEXT_PUBLIC_APP_URL should be set to e.g. "https://vexatryon.in"
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (explicit) return explicit;
  // Vercel injects VERCEL_URL (no scheme) on preview/prod deployments
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:4028';
}

/**
 * Stores image bytes in the `temp_assets` table and returns a public
 * /api/serve/[id] URL that external services can fetch.
 *
 * Returns null when the insert fails (e.g. table doesn't exist yet).
 */
export async function storeAsTempAsset(
  buffer: Buffer,
  mimeType: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    const { data, error } = await (supabase.from('temp_assets') as any)
      .insert({ data: buffer.toString('base64'), mime_type: mimeType })
      .select('id')
      .single();

    if (error || !data?.id) {
      logger.warn('[tempAsset] DB insert failed:', error?.message ?? 'no id returned');
      return null;
    }

    const base = getAppBaseUrl();
    return `${base}/api/serve/${data.id}`;
  } catch (err: unknown) {
    logger.warn('[tempAsset] unexpected error:', err instanceof Error ? err.message : String(err));
    return null;
  }
}
