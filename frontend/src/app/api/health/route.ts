import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getAvatarServiceUrl } from '@/lib/env';

export async function GET() {
  const timestamp = new Date().toISOString();
  let supabaseStatus = false;
  let avatarServiceStatus: boolean | null = null;
  let avatarServiceMode: 'ok' | 'degraded' | 'skipped' | 'unavailable' = 'skipped';

  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('api_keys').select('id').limit(1);
    supabaseStatus = !error;
  } catch (e) {
    console.error('Health check: Supabase ping failed', e);
  }

  const avatarServiceUrl = getAvatarServiceUrl();
  if (avatarServiceUrl) {
    try {
      const res = await fetch(`${avatarServiceUrl.replace(/\/$/, '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      avatarServiceStatus = res.ok;
      avatarServiceMode = res.ok ? 'ok' : 'unavailable';
    } catch (e) {
      console.error('Health check: Avatar service ping failed', e);
      avatarServiceStatus = false;
      avatarServiceMode = 'unavailable';
    }
  } else {
    avatarServiceMode = 'skipped';
  }

  const coreOk = supabaseStatus;
  const optionalOk = avatarServiceUrl ? avatarServiceStatus === true : true;
  const overall =
    coreOk && optionalOk ? 'ok' : coreOk && !optionalOk ? 'degraded' : 'unavailable';

  return NextResponse.json({
    status: overall,
    supabase: supabaseStatus,
    avatarService: avatarServiceStatus,
    avatarServiceMode,
    timestamp,
  });
}
