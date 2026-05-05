import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const key = req.headers.get('x-vexa-key');

    if (!key) {
      return NextResponse.json({ valid: false, error: 'No API key provided' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ valid: false, error: 'Server configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const { data: apiKeyRecord, error } = await supabase
      .from('api_keys')
      .select('marketplace_name, status')
      .eq('key', key)
      .single();

    if (error || !apiKeyRecord) {
      return NextResponse.json({ valid: false, error: 'Invalid API key' }, { status: 401 });
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
