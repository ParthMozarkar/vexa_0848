// Install: npm install bullmq ioredis
// Run separately: node --experimental-specifier-resolution=node dist/workers/aiWorker.js
// Or via: ts-node frontend/src/workers/aiWorker.ts

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Worker } = require('bullmq') as {
  Worker: new <T>(name: string, fn: (job: { data: T; progress?: number }) => Promise<unknown>, opts: Record<string, unknown>) => void;
};
type Job<T> = { data: T; progress?: number };
import {
  QUEUE_NAMES,
  type TryonVideoJobData,
  type AvatarHeavyJobData,
  type MeshyGenJobData,
} from '../lib/queues';

const CONCURRENCY = {
  [QUEUE_NAMES.TRYON_VIDEO]: parseInt(process.env.WORKER_CONCURRENCY_VIDEO ?? '2'),
  [QUEUE_NAMES.AVATAR_HEAVY]: parseInt(process.env.WORKER_CONCURRENCY_AVATAR ?? '1'),
  [QUEUE_NAMES.MESHY_GEN]: parseInt(process.env.WORKER_CONCURRENCY_MESHY ?? '3'),
};

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };

// Video try-on worker
new Worker(
  QUEUE_NAMES.TRYON_VIDEO,
  async (job: Job<TryonVideoJobData>) => {
    const { userId, videoUrl, productImageUrl, productId } = job.data;
    const apiKey = process.env.TNB_API_KEY;
    if (!apiKey) throw new Error('TNB_API_KEY not configured');
    const formData = new FormData();
    formData.append('person_video', videoUrl);
    formData.append('clothing_photo', productImageUrl);
    const res = await fetch(`https://thenewblack.ai/api/1.1/wf/vto_video?api_key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(300_000),
    });
    if (!res.ok) throw new Error(`TNB video failed: ${res.status}`);
    const resultUrl = (await res.text()).trim();
    return { resultUrl, userId, productId, status: 'ready' };
  },
  { connection, concurrency: CONCURRENCY[QUEUE_NAMES.TRYON_VIDEO] },
);

// Avatar heavy worker
new Worker(
  QUEUE_NAMES.AVATAR_HEAVY,
  async (job: Job<AvatarHeavyJobData>) => {
    const { userId, photoUrl, measurements } = job.data;
    const pyServiceUrl = process.env.AVATAR_SERVICE_URL ?? process.env.PYTHON_SERVICE_URL;
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
    if (!pyServiceUrl) throw new Error('AVATAR_SERVICE_URL not configured');
    const res = await fetch(`${pyServiceUrl}/generate-avatar-full`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(internalToken ? { Authorization: `Bearer ${internalToken}` } : {}),
      },
      body: JSON.stringify({ photo_url: photoUrl, measurements }),
      signal: AbortSignal.timeout(300_000),
    });
    if (!res.ok) throw new Error(`Avatar service failed: ${res.status}`);
    const data = (await res.json()) as { avatar_url?: string };
    if (!data.avatar_url) throw new Error('No avatar_url in response');
    return { avatarUrl: data.avatar_url, userId, status: 'ready' };
  },
  { connection, concurrency: CONCURRENCY[QUEUE_NAMES.AVATAR_HEAVY] },
);

// Meshy/BlackBox model-gen worker
new Worker(
  QUEUE_NAMES.MESHY_GEN,
  async (job: Job<MeshyGenJobData>) => {
    const { garmentImageUrl, modelGender } = job.data;
    const apiKey = process.env.BLACKBOX_API_KEY;
    if (!apiKey) throw new Error('BLACKBOX_API_KEY not configured');
    const form = new FormData();
    form.append('clothing_image', garmentImageUrl);
    form.append('gender', modelGender);
    const res = await fetch('https://api.blackbox.ai/api/v1/model-gen', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`BlackBox failed: ${res.status}`);
    const json = (await res.json()) as { output_url?: string };
    if (!json.output_url) throw new Error('No output_url from BlackBox');
    return { modelImageUrl: json.output_url };
  },
  { connection, concurrency: CONCURRENCY[QUEUE_NAMES.MESHY_GEN] },
);

console.warn('[AI Worker] Running. Queues:', Object.values(QUEUE_NAMES).join(', '));
