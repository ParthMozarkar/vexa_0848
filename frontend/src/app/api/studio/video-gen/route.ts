
import { NextRequest, NextResponse } from 'next/server';
import { OrchestrationEngine } from '@/lib/orchestration/OrchestrationEngine';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface VideoGenRequest {
  imageUrl: string;
  prompt?: string;
  duration?: '5' | '10';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { imageUrl, prompt, duration = '5' } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const result = await OrchestrationEngine.execute(
      'video-gen',
      { imageUrl, prompt, duration },
      { timeoutMs: 120000 }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ 
      videoUrl: result.outputUrl, 
      type: 'video',
      provider: result.providerId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/studio/video-gen]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
