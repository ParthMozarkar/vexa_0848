import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hashApiKey } from '@/lib/crypto';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function middleware(req: NextRequest) {
  // OBS-04: Propagate or generate a request ID for tracing across all API routes.
  const requestId = req.headers.get('x-request-id') || `req_${Date.now().toString(36)}`;

  if (req.nextUrl.pathname.startsWith('/api/keys')) {
    const keysResponse = NextResponse.next();
    keysResponse.headers.set('x-request-id', requestId);
    return keysResponse;
  }

  const apiKeyHeader = req.headers.get('x-vexa-key');

  if (!apiKeyHeader) {
    const demoResponse = NextResponse.next();
    demoResponse.headers.set('x-request-id', requestId);
    return demoResponse;
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
      const invalidRes = NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      invalidRes.headers.set('x-request-id', requestId);
      return invalidRes;
    }

    const limit =
      typeof keyRecord.monthly_limit === 'number' && keyRecord.monthly_limit > 0
        ? keyRecord.monthly_limit
        : 1000;

    if (keyRecord.call_count >= limit) {
      const limitRes = NextResponse.json({ error: 'Monthly limit exceeded' }, { status: 429 });
      limitRes.headers.set('x-request-id', requestId);
      return limitRes;
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

    const authedResponse = NextResponse.next();
    authedResponse.headers.set('x-request-id', requestId);
    return authedResponse;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[middleware] API key gate failed:', msg);
    const errRes = NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
    errRes.headers.set('x-request-id', requestId);
    return errRes;
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
