import { NextResponse } from 'next/server';
import { hashApiKey } from '@/lib/crypto';
import { logAdminAction } from '@/lib/admin';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { emitAuditLog, buildAuditEntry } from '@/lib/auditLog';

export async function POST(req: Request) {
  try {
    // 1. Authentication Check
    const authHeader = req.headers.get('Authorization');
    const adminSecret = process.env.VEXA_ADMIN_KEY;

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized — Admin token required' }, { status: 401 });
    }

    const body = await req.json();
    const { marketplace_name, monthly_limit } = body;

    if (!marketplace_name) {
      return NextResponse.json({ error: 'Missing marketplace_name' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 2. Generate raw key and marketplace_id
    const rawKey = `vexa_${crypto.randomUUID()}`;
    const marketplaceId = `mkt_${crypto.randomUUID().split('-')[0]}`;
    const hashedKey = await hashApiKey(rawKey);

    // 3. Store hashed key in DB
    const { error } = await supabase
      .from('api_keys')
      .insert({
        marketplace_id: marketplaceId,
        marketplace_name: marketplace_name,
        key_hash: hashedKey,
        monthly_limit: monthly_limit || 10000,
        call_count: 0,
        status: 'active'
      });

    if (error) {
      console.error("[/api/keys/generate] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. Audit Log
    await logAdminAction('GENERATE_API_KEY', '/api/keys/generate', marketplaceId, {
      marketplace_name,
      monthly_limit
    });

    emitAuditLog(buildAuditEntry({
      action: 'api_key.generated',
      actor: 'system',
      resource: marketplaceId,
      outcome: 'success',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
      userAgent: req.headers.get('user-agent') ?? null,
      metadata: { marketplace_name },
    }));

    // 5. Return raw key ONLY ONCE
    return NextResponse.json({
      marketplace_id: marketplaceId,
      marketplace_name: marketplace_name,
      api_key: rawKey,
      note: 'Save this key carefully. It will not be shown again.'
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

