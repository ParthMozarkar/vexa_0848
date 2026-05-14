import { NextRequest, NextResponse } from 'next/server';
import { enqueueJob, QUEUE_NAMES, type MeshyGenJobData } from '@/lib/queues';
import { jobStore, generateJobId } from '@/lib/jobStore';

export const runtime = 'nodejs';

interface ModelGenRequest {
  garmentImageUrl: string;
  modelGender?: 'male' | 'female';
  userId?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as ModelGenRequest;
    const { garmentImageUrl, modelGender = 'female', userId = '' } = body;

    if (!garmentImageUrl) {
      return NextResponse.json({ error: 'garmentImageUrl is required' }, { status: 400 });
    }

    // Enqueue via BullMQ; fall back to in-memory store when Redis unavailable
    const jobData: MeshyGenJobData = { garmentImageUrl, modelGender, userId };
    const enqueued = await enqueueJob(QUEUE_NAMES.MESHY_GEN, jobData);

    if (enqueued) {
      return NextResponse.json({ jobId: enqueued.jobId, status: 'queued' }, { status: 202 });
    }

    // Redis not available — fall back to in-memory job tracking
    const apiKey = process.env.BLACKBOX_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'BLACKBOX_API_KEY not configured' }, { status: 500 });
    }

    const fallbackJobId = generateJobId();
    jobStore.set(fallbackJobId, {
      id: fallbackJobId,
      status: 'queued',
      createdAt: Date.now(),
    });

    // Fire-and-forget: run the model-gen call asynchronously
    void (async () => {
      try {
        jobStore.update(fallbackJobId, { status: 'active' });
        const form = new FormData();
        form.append('clothing_image', garmentImageUrl);
        form.append('gender', modelGender);
        const res = await fetch('https://api.blackbox.ai/api/v1/model-gen', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
          signal: AbortSignal.timeout(120_000),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => 'unknown');
          throw new Error(`BlackBox model-gen failed (${res.status}): ${errText}`);
        }
        const json = (await res.json()) as { output_url?: string };
        if (!json.output_url) throw new Error('BlackBox API returned success but no output_url');
        jobStore.update(fallbackJobId, {
          status: 'completed',
          result: { modelImageUrl: json.output_url },
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[/api/studio/model-gen] async fallback failed:', msg);
        jobStore.update(fallbackJobId, { status: 'failed', error: msg });
      }
    })();

    return NextResponse.json({ jobId: fallbackJobId, status: 'queued' }, { status: 202 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/studio/model-gen]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
