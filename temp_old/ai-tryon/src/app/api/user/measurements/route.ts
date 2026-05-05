import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    // Get headers to extract cookie/auth info
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('users')
      .select('height_cm, chest_cm, waist_cm, hips_cm, inseam_cm, shoulder_cm')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      height_cm, 
      chest_cm, 
      waist_cm, 
      hips_cm, 
      inseam_cm, 
      shoulder_cm 
    } = body;

    // 1. Validate body
    const m = { height_cm, chest_cm, waist_cm, hips_cm, inseam_cm, shoulder_cm };
    for (const [key, val] of Object.entries(m)) {
      if (typeof val !== 'number' || val <= 0) {
        return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
      }
    }

    if (height_cm < 100 || height_cm > 250) {
      return NextResponse.json({ error: 'Height must be between 100cm and 250cm' }, { status: 400 });
    }

    const others = [chest_cm, waist_cm, hips_cm, inseam_cm, shoulder_cm];
    if (others.some(v => v < 30 || v > 200)) {
      return NextResponse.json({ error: 'Measurements must be between 30cm and 200cm' }, { status: 400 });
    }

    // AUTH
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authHeader = req.headers.get('Authorization');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Upsert into users table using service role
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    const { error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: user.id,
        ...m,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, measurements: m });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
