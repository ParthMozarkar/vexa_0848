import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = process.env.INTERNAL_SERVICE_TOKEN;

    if (!token || authHeader !== `Bearer ${token}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userId, glbUrl, archetypeIds, status } = body;

    if (!userId || !glbUrl) {
      return NextResponse.json({ error: 'Missing userId or glbUrl' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database config missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { error: avatarError } = await supabase.from('avatars').upsert({
      user_id: userId,
      glb_url: glbUrl,
      status: status ?? 'ready',
      archetype_ids: archetypeIds ?? [],
    });

    if (avatarError) throw avatarError;

    const { error: userError } = await supabase
      .from('users')
      .update({ avatar_url: glbUrl })
      .eq('id', userId);

    if (userError) throw userError;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
