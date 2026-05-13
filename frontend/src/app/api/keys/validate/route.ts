import { NextRequest, NextResponse } from 'next/server';
import { hashApiKey } from '@/lib/crypto';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const key = req.headers.get('x-vexa-key');

    if (!key) {
      return NextResponse.json({ valid: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const hashedKey = await hashApiKey(key);

    const { data: apiKeyRecord, error } = await supabase
      .from('api_keys')
      .select('marketplace_name, status')
      .eq('key_hash', hashedKey)
      .single();

    if (error || !apiKeyRecord) {
      return NextResponse.json({ valid: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (apiKeyRecord.status !== 'active') {
      return NextResponse.json({ valid: false, error: 'API key revoked or inactive' }, { status: 403 });
    }

    return NextResponse.json({ 
      valid: true, 
      marketplace_name: apiKeyRecord.marketplace_name 
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ valid: false, error: err.message }, { status: 500 });
  }
}
