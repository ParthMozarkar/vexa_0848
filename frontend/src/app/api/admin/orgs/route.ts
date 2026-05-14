import { NextRequest, NextResponse } from 'next/server';
import { requireAdminKey } from '@/lib/adminAuth';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import type { OrgAdminRecord } from '@/types/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const adminCheck = requireAdminKey(req);
  if (adminCheck) return adminCheck;

  const supabase = createServerSupabaseClient();

  // Get all orgs with key counts
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name, plan')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    // organizations table may not exist yet — return empty gracefully
    return NextResponse.json({ orgs: [], note: 'organizations table not yet created' });
  }

  const records: OrgAdminRecord[] = (orgs ?? []).map(
    (org: { id: string; name: string; plan?: string }) => ({
      orgId: org.id,
      name: org.name,
      plan: org.plan ?? 'free',
      apiKeyCount: 0, // TODO: join with api_keys table
      dailyUsed: 0,
      dailyLimit: 0,
      monthlyUsed: 0,
      monthlyLimit: 0,
      quotaStatus: 'ok' as const,
    }),
  );

  return NextResponse.json({ orgs: records });
}
