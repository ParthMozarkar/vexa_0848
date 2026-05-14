
import { NextRequest, NextResponse } from 'next/server';
import { OrchestrationEngine } from '@/lib/orchestration/OrchestrationEngine';
import { AIProvider } from '@/lib/orchestration/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface VideoGenRequest {
  imageUrl: string;
  prompt?: string;
  duration?: '5' | '10';
}

/**
 * Generic video provider executor
 */
async function executeVideoProvider(provider: AIProvider, data: any): Promise<string> {
  const { imageUrl, prompt, duration } = data;
  const apiKey = process.env.TNB_API_KEY || process.env.NEWBLACK_API_KEY;

  if (provider.id.startsWith('tnb')) {
    // For TNB Video, we usually use the vto-video or similar endpoint
    // Assuming the endpoint logic based on user's current TNB setup
    const endpoint = 'vto_video'; 
    const formData = new FormData();
    formData.append('image_url', imageUrl);
    formData.append('prompt', prompt || 'Elegant fashion motion');
    formData.append('duration', duration || '5');

    const res = await fetch(`https://thenewblack.ai/api/1.1/wf/${endpoint}?api_key=${apiKey}`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) throw new Error(`TNB Video Error: ${res.status}`);
    const text = await res.text();
    // Use the same robust parsing as tryon
    if (text.trim().startsWith('http')) return text.trim();
    if (text.trim().startsWith('//')) return 'https:' + text.trim();
    try {
      const json = JSON.parse(text);
      return json.output_url || json.url || json.response || text;
    } catch {
      return text.trim();
    }
  }

  throw new Error(`Provider ${provider.id} not implemented for video-gen`);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { imageUrl, prompt, duration = '5' } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const result = await OrchestrationEngine.executeWithOrchestration(
      'video-gen',
      { imageUrl, prompt, duration },
      executeVideoProvider,
      { timeoutMs: 120000, minQualityScore: 70 }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ 
      videoUrl: result.outputUrl, 
      type: 'video',
      provider: result.providerId,
      qualityScore: result.qualityScore 
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/studio/video-gen]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
