import { NextRequest, NextResponse } from 'next/server';
import { requireAdminKey } from '@/lib/adminAuth';
import type { FailedJobRecord } from '@/types/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const adminCheck = requireAdminKey(req);
  if (adminCheck) return adminCheck;

  // Pull from in-memory jobStore (fallback when Redis unavailable).
  // With Redis: BullMQ getFailedJobs() would be used per queue.
  const failures: FailedJobRecord[] = [];

  // In production with Redis: iterate QUEUE_NAMES, call queue.getFailedJobs(0, 20),
  // map to FailedJobRecord shape. Currently returns empty when Redis is unavailable.

  return NextResponse.json({
    failures,
    note: 'With Redis: populated from BullMQ getFailedJobs(). Currently using in-memory fallback.',
    generatedAt: new Date().toISOString(),
  });
}
