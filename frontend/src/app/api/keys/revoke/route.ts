import { NextRequest, NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/admin';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication Check
    const authHeader = req.headers.get('Authorization');
    const adminSecret = process.env.VEXA_ADMIN_KEY;

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized — Admin token required' }, { status: 401 });
    }

    const body = await req.json();
    const { key_id } = body;

    if (!key_id) {
      return NextResponse.json({ error: 'key_id is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('api_keys')
      .update({ status: 'revoked' })
      .eq('id', key_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. Audit Log
    await logAdminAction('REVOKE_API_KEY', '/api/keys/revoke', key_id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

