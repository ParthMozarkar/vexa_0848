import { NextRequest, NextResponse } from 'next/server';
import { requireAdminKey } from '@/lib/adminAuth';
import { getQueue, QUEUE_NAMES } from '@/lib/queues';
import type { QueueStatus } from '@/types/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const adminCheck = requireAdminKey(req);
  if (adminCheck) return adminCheck;

  const statuses: QueueStatus[] = [];

  for (const name of Object.values(QUEUE_NAMES)) {
    const queue = getQueue(name);
    if (!queue) {
      statuses.push({ name, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 });
      continue;
    }
    try {
      // BullMQ queue counts — cast to any since BullQueue interface is minimal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q = queue as any;
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        q.getWaitingCount?.() ?? 0,
        q.getActiveCount?.() ?? 0,
        q.getCompletedCount?.() ?? 0,
        q.getFailedCount?.() ?? 0,
        q.getDelayedCount?.() ?? 0,
      ]);
      statuses.push({ name, waiting, active, completed, failed, delayed });
    } catch {
      statuses.push({ name, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 });
    }
  }

  return NextResponse.json({ queues: statuses });
}
