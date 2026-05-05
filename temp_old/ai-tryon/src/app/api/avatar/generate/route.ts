import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, photoUrl, measurements } = body as {
      userId: string;
      photoUrl: string;
      measurements: {
        height_cm: number;
        chest_cm: number;
        waist_cm: number;
        hips_cm: number;
        inseam_cm: number;
        shoulder_cm: number;
      };
    };

    if (!userId || !photoUrl || !measurements) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Forward the request to the Python backend
    const avatarServiceUrl = process.env.AVATAR_SERVICE_URL;
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN;

    if (!avatarServiceUrl) {
      throw new Error('AVATAR_SERVICE_URL is not configured');
    }

    const pythonResponse = await fetch(`${avatarServiceUrl}/generate-avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalToken || ''}`,
      },
      body: JSON.stringify({
        photo_url: photoUrl,
        measurements: {
          height: measurements.height_cm,
          chest: measurements.chest_cm,
          waist: measurements.waist_cm,
          hips: measurements.hips_cm,
          inseam: measurements.inseam_cm,
          shoulder_width: measurements.shoulder_cm,
        },
      }),
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      return NextResponse.json({ error: `Avatar service failed: ${pythonResponse.status} - ${errorText}` }, { status: 500 });
    }

    const pythonData = await pythonResponse.json();
    const { avatar_url, archetypes } = pythonData;

    // 2. On success, upsert a row into Supabase avatars table
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Supabase environment variables are missing.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error: dbError } = await supabase
      .from('avatars')
      .upsert({
        user_id: userId,
        glb_url: avatar_url,
        status: 'ready',
        archetype_ids: archetypes.map((a: { name: string; weight: number }) => a.name),
        blend_weights: archetypes.map((a: { name: string; weight: number }) => a.weight),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (dbError) {
      console.error('Failed to upsert avatar:', dbError);
    }

    // 3. Return { avatarUrl, status: 'ready', archetypes }
    return NextResponse.json({
      avatarUrl: avatar_url,
      status: 'ready',
      archetypes,
    });

  } catch (error: any) {
    console.error('Avatar generation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
