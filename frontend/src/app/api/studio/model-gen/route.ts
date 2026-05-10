import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface ModelGenRequest {
  garmentImageUrl: string;
  modelGender?: 'male' | 'female';
}

interface ModelGenResponse {
  modelImageUrl: string;
}

const BLACKBOX_BASE_URL = 'https://api.blackbox.ai/api/v1/model-gen';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as ModelGenRequest;
    const { garmentImageUrl, modelGender = 'female' } = body;

    if (!garmentImageUrl) {
      return NextResponse.json({ error: 'garmentImageUrl is required' }, { status: 400 });
    }

    const apiKey = process.env.BLACKBOX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'BLACKBOX_API_KEY not configured' }, { status: 500 });
    }

    const form = new FormData();
    form.append('clothing_image', garmentImageUrl);
    form.append('gender', modelGender);
    
    const res = await fetch(BLACKBOX_BASE_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      throw new Error(`BlackBox model-gen failed (${res.status}): ${errText}`);
    }

    const json = await res.json();
    if (json.output_url) {
      return NextResponse.json({ modelImageUrl: json.output_url } satisfies ModelGenResponse);
    }
    throw new Error('BlackBox API returned success but no output_url');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/studio/model-gen]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
