/**
 * Centralized environment access + validation for server-side code.
 * - Production: service-role key is required for privileged Supabase operations.
 * - Development: falls back to anon with a one-time console warning (local DX).
 */

const warnedKeys = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(`[env] ${message}`);
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getPublicSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  return url;
}

export function getPublicSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return key;
}

/**
 * Key used by Next.js route handlers / middleware that need to bypass RLS.
 * In production this MUST be the service role key — never the anon key.
 */
export function getServerSupabaseSecretKey(): string {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (service) return service;

  if (isProductionRuntime()) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required in production for server-side Supabase access',
    );
  }

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!anon) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  warnOnce(
    'supabase-service-fallback',
    'SUPABASE_SERVICE_ROLE_KEY is not set — using NEXT_PUBLIC_SUPABASE_ANON_KEY for local development only. ' +
      'Set SUPABASE_SERVICE_ROLE_KEY in staging/production.',
  );
  return anon;
}

/**
 * Optional avatar / Python service URL (may be unset in many deployments).
 */
export function getAvatarServiceUrl(): string | undefined {
  const raw = process.env.AVATAR_SERVICE_URL || process.env.PYTHON_SERVICE_URL;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}
