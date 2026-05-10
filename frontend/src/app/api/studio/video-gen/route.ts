import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface VideoGenRequest {
  imageUrl: string;
  prompt?: string;
  duration?: '5' | '10';
}

interface VideoGenResponse {
  videoUrl?: string;
  frameUrls?: string[];
  type: 'video' | 'frames';
}

const BLACKBOX_BASE_URL = 'https://api.blackbox.ai/api/v1/video-gen';
const DEFAULT_PROMPT = 'Fashion model naturally showcasing the outfit with elegant movements';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as VideoGenRequest;
    const { imageUrl, prompt, duration = '5' } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const apiKey = process.env.BLACKBOX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'BLACKBOX_API_KEY not configured' }, { status: 500 });
    }

    const finalPrompt = prompt?.trim() && prompt.trim().length >= 3 ? prompt.trim() : DEFAULT_PROMPT;

    const form = new FormData();
    form.append('image_url', imageUrl);
    form.append('prompt', finalPrompt);
    form.append('duration', duration);

    const res = await fetch(BLACKBOX_BASE_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      throw new Error(`BlackBox video-gen failed (${res.status}): ${errText}`);
    }

    const json = await res.json();
    if (json.output_url) {
      return NextResponse.json({ videoUrl: json.output_url, type: 'video' } satisfies VideoGenResponse);
    }
    throw new Error('BlackBox API returned success but no output_url');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/studio/video-gen]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
