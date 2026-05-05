import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, avatarUrl, archetypes } = body;

    if (!userId || !avatarUrl) {
      return NextResponse.json({ error: 'Missing userId or avatarUrl' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from('avatars')
      .upsert({
        user_id: userId,
        glb_url: avatarUrl,
        status: 'ready',
        archetype_ids: archetypes?.map((a: any) => a.name) || [],
        blend_weights: archetypes?.map((a: any) => a.weight) || [],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Avatar webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
