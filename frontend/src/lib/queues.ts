// Install: npm install bullmq ioredis
// Defines queue names, job data types, and Queue instances

interface BullQueue {
  add(name: string, data: unknown, opts?: { jobId?: string }): Promise<{ id?: string }>;
  getJob(id: string): Promise<{ getState(): Promise<string>; returnvalue: unknown; failedReason?: string; progress?: number } | null>;
}

export const QUEUE_NAMES = {
  TRYON_VIDEO: 'tryon-video',
  AVATAR_HEAVY: 'avatar-heavy',
  MESHY_GEN: 'meshy-gen',
} as const;

export interface TryonVideoJobData {
  userId: string;
  videoUrl: string;
  productImageUrl: string;
  productId: string;
}

export interface AvatarHeavyJobData {
  userId: string;
  photoUrl: string;
  measurements: Record<string, number>;
}

export interface MeshyGenJobData {
  garmentImageUrl: string;
  modelGender: 'male' | 'female';
  userId: string;
}

export type JobData = TryonVideoJobData | AvatarHeavyJobData | MeshyGenJobData;

let _queues: Map<string, BullQueue> | null = null;

export function getQueue(name: string): BullQueue | null {
  if (!process.env.REDIS_URL) return null;
  if (!_queues) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Queue } = require('bullmq') as { Queue: new (name: string, opts: Record<string, unknown>) => BullQueue };
      _queues = new Map();
      for (const qName of Object.values(QUEUE_NAMES)) {
        _queues.set(
          qName,
          new Queue(qName, {
            connection: { url: process.env.REDIS_URL },
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 1000 },
              removeOnComplete: { age: 86400 },
              removeOnFail: { age: 86400 * 7 },
            },
          }),
        );
      }
    } catch {
      return null;
    }
  }
  return _queues?.get(name) ?? null;
}

export async function enqueueJob(
  queueName: string,
  data: JobData,
  jobId?: string,
): Promise<{ jobId: string } | null> {
  const queue = getQueue(queueName);
  if (!queue) return null;
  const job = await queue.add(queueName, data, { jobId });
  return { jobId: job.id ?? jobId ?? `job_${Date.now()}` };
}
