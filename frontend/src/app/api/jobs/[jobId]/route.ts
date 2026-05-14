import { NextRequest, NextResponse } from 'next/server';
import { getQueue, QUEUE_NAMES } from '@/lib/queues';
import { jobStore } from '@/lib/jobStore';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params;

  // Try BullMQ first (all queues)
  for (const qName of Object.values(QUEUE_NAMES)) {
    const queue = getQueue(qName);
    if (!queue) continue;
    try {
      const job = await queue.getJob(jobId);
      if (!job) continue;
      const state = await job.getState();
      const result = state === 'completed' ? job.returnvalue : undefined;
      const failedReason = state === 'failed' ? job.failedReason : undefined;
      return NextResponse.json({
        jobId,
        status: state,
        result: result ?? null,
        error: failedReason ?? null,
        progress: job.progress ?? null,
      });
    } catch {
      continue;
    }
  }

  // Fallback: in-memory store
  const record = jobStore.get(jobId);
  if (record) {
    return NextResponse.json({ jobId, ...record });
  }

  return NextResponse.json({ error: 'Job not found' }, { status: 404 });
}
