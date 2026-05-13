import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hashApiKey } from '@/lib/crypto';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/keys')) {
    return NextResponse.next();
  }

  const apiKeyHeader = req.headers.get('x-vexa-key');

  if (!apiKeyHeader) {
    return NextResponse.next();
  }

  try {
    const supabase = createServerSupabaseClient();

    const hashedKey = await hashApiKey(apiKeyHeader);
    const { data: keyRecord, error: keyError } = await supabase
      .from('api_keys')
      .select('id, status, call_count, monthly_limit')
      .eq('key_hash', hashedKey)
      .single();

    if (keyError || !keyRecord || keyRecord.status !== 'active') {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const limit =
      typeof keyRecord.monthly_limit === 'number' && keyRecord.monthly_limit > 0
        ? keyRecord.monthly_limit
        : 1000;

    if (keyRecord.call_count >= limit) {
      return NextResponse.json({ error: 'Monthly limit exceeded' }, { status: 429 });
    }

    const newCount = keyRecord.call_count + 1;
    await supabase.from('api_keys').update({ call_count: newCount }).eq('id', keyRecord.id);

    await supabase.from('usage_logs').insert({
      api_key_id: keyRecord.id,
      endpoint: req.nextUrl.pathname,
      status: 200,
      response_time_ms: 0,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.next();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[middleware] API key gate failed:', msg);
    return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
