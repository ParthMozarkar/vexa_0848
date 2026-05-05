import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { marketplace_name } = body;

    if (!marketplace_name) {
      return NextResponse.json({ error: 'marketplace_name is required' }, { status: 400 });
    }

    // 2. Generate cryptographically random key
    const rawKey = `vxa_${crypto.randomBytes(32).toString('hex')}`;

    // 3. Hash with SHA-256
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // 4. Insert into api_keys table using service role
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        marketplace_id: user.id,
        marketplace_name,
        key_hash: keyHash,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('API Key insertion error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5. Return the raw key only once
    return NextResponse.json({ key: rawKey, id: data.id });

  } catch (error: any) {
    console.error('API Key generation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
