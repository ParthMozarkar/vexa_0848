/**
 * GET /api/serve/[id]
 *
 * Serves a temporary image stored in the `temp_assets` table.
 * Used as a last-resort public URL when Cloudflare R2 and Supabase Storage
 * are both unavailable, so external AI APIs (TNB etc.) can fetch the image.
 *
 * Images expire after 2 hours (set by the migration default).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { id } = params;

  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('temp_assets')
    .select('data, mime_type, expires_at')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Expired' }, { status: 410 });
  }

  const buffer = Buffer.from(data.data as string, 'base64');

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': (data.mime_type as string) || 'image/png',
      'Cache-Control': 'public, max-age=7200',
      'Content-Length': String(buffer.byteLength),
    },
  });
}
