// Runtime scaling configuration — single file to tune all scaling parameters.
// All values read from env vars with safe defaults.
//
// Usage:
//   import { SCALING_CONFIG } from '@/lib/scalingConfig';
//   const concurrency = SCALING_CONFIG.workers.tryonVideo;
//
// All env vars are documented in docs/AI-INFRA-ARCH.md and docs/WORKER-SCALING.md.

export const SCALING_CONFIG = {
  workers: {
    tryonVideo: parseInt(process.env.WORKER_CONCURRENCY_VIDEO ?? '2'),
    avatarHeavy: parseInt(process.env.WORKER_CONCURRENCY_AVATAR ?? '1'),
    meshyGen: parseInt(process.env.WORKER_CONCURRENCY_MESHY ?? '3'),
  },
  queues: {
    maxDepthWarning: parseInt(process.env.QUEUE_DEPTH_WARNING ?? '100'),
    maxDepthCritical: parseInt(process.env.QUEUE_DEPTH_CRITICAL ?? '500'),
    jobRetentionCompletedSec: parseInt(process.env.JOB_RETENTION_COMPLETED_SEC ?? '86400'),
    jobRetentionFailedSec: parseInt(process.env.JOB_RETENTION_FAILED_SEC ?? '604800'),
  },
  cache: {
    generationTtlSec: parseInt(process.env.CACHE_TTL_GENERATION ?? '86400'),
    uploadDedupTtlSec: parseInt(process.env.CACHE_TTL_UPLOAD_DEDUP ?? '604800'),
    imageResolutionTtlSec: parseInt(process.env.CACHE_TTL_IMAGE_RESOLUTION ?? '3600'),
    lruMaxEntries: parseInt(process.env.CACHE_LRU_MAX_ENTRIES ?? '500'),
  },
  rateLimit: {
    maxAiCallsPerUserPerDay: parseInt(process.env.MAX_AI_CALLS_PER_USER_DAY ?? '20'),
    maxHedgeConcurrency: parseInt(process.env.MAX_HEDGE_CONCURRENCY ?? '2'),
    burstWindowMs: parseInt(process.env.BURST_WINDOW_MS ?? '10000'),
    burstMaxCalls: parseInt(process.env.BURST_MAX_CALLS ?? '5'),
  },
  storage: {
    r2BucketName: process.env.R2_BUCKET_NAME ?? 'vexa-assets',
    r2PublicUrl: process.env.R2_PUBLIC_URL ?? '',
    resultRetentionDays: parseInt(process.env.RESULT_RETENTION_DAYS ?? '90'),
  },
} as const;

export type ScalingConfig = typeof SCALING_CONFIG;
