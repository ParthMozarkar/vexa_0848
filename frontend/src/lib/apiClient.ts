// Centralized API client — typed requests, typed responses, error normalization.
// All frontend-to-Next.js API route calls should go through this client.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string; bypassCache?: boolean } = {},
): Promise<ApiResponse<T>> {
  const { token, bypassCache, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  if (!headers.has('Content-Type') && fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (bypassCache) headers.set('x-cache-bypass', 'true');

  const res = await fetch(path, { ...fetchOptions, headers });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
    const message = (body as Record<string, string>)?.error ?? res.statusText;
    throw new ApiError(res.status, message, body);
  }

  const data = await res.json() as T;
  return { data, status: res.status };
}

// ─── Try-On ──────────────────────────────────────────────────────────────────

export interface TryOnPayload {
  userId: string;
  userPhotoUrl?: string;
  productImageUrl?: string;
  productId?: string;
  category?: string;
  garments?: Array<{ url: string; category: string }>;
}

export interface TryOnApiResponse {
  resultUrl?: string;
  status: string;
  fitLabel?: string;
  recommendedSize?: string;
  fitScore?: number;
  generationsRemaining?: number | null;
  jobId?: string;
}

export async function tryOn(payload: TryOnPayload, token?: string): Promise<TryOnApiResponse> {
  const { data } = await request<TryOnApiResponse>('/api/tryon', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
  return data;
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function uploadPhoto(file: File, token?: string): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, string>;
    throw new ApiError(res.status, body.error ?? 'Upload failed', body);
  }
  return res.json() as Promise<{ url: string }>;
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

export interface AvatarGeneratePayload {
  userId: string;
  photoUrl?: string;
  photoBase64?: string;
  measurements: unknown;
}

export interface AvatarGenerateApiResponse {
  avatarUrl?: string;
  status: string;
  jobId?: string;
}

export async function generateAvatar(
  payload: AvatarGeneratePayload,
  token: string,
): Promise<AvatarGenerateApiResponse> {
  const { data } = await request<AvatarGenerateApiResponse>('/api/avatar/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
  return data;
}

// ─── Jobs / Polling ──────────────────────────────────────────────────────────

export interface JobStatusApiResponse {
  jobId: string;
  status: 'queued' | 'active' | 'completed' | 'failed' | string;
  result?: unknown;
  error?: string | null;
  progress?: number | null;
}

export async function getJobStatus(jobId: string, token?: string): Promise<JobStatusApiResponse> {
  const { data } = await request<JobStatusApiResponse>(`/api/jobs/${jobId}`, { token });
  return data;
}

export async function pollJobUntilComplete(
  jobId: string,
  options: { intervalMs?: number; maxWaitMs?: number; token?: string } = {},
): Promise<JobStatusApiResponse> {
  const { intervalMs = 2000, maxWaitMs = 300_000, token } = options;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const status = await getJobStatus(jobId, token);
    if (status.status === 'completed' || status.status === 'failed') return status;
    await new Promise(r => setTimeout(r, intervalMs));
  }

  throw new ApiError(408, `Job ${jobId} did not complete within ${maxWaitMs}ms`);
}

// ─── Keys ────────────────────────────────────────────────────────────────────

export interface ValidateKeyApiResponse {
  valid: boolean;
  marketplace_name?: string;
  error?: string;
}

export async function validateApiKey(key: string): Promise<ValidateKeyApiResponse> {
  const { data } = await request<ValidateKeyApiResponse>('/api/keys/validate', {
    headers: { 'x-vexa-key': key },
  });
  return data;
}

// ─── Studio ──────────────────────────────────────────────────────────────────

export interface StudioDesignPayload {
  userId?: string;
  prompt: string;
  style?: string;
  category?: string;
}

export interface StudioDesignApiResponse {
  imageUrl?: string;
  jobId?: string;
  status?: string;
}

export async function generateDesign(
  payload: StudioDesignPayload,
  token?: string,
): Promise<StudioDesignApiResponse> {
  const { data } = await request<StudioDesignApiResponse>('/api/studio/design', {
    method: 'POST',
    body: JSON.stringify(payload),
    token,
  });
  return data;
}

// ─── Health ──────────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string }> {
  const { data } = await request<{ status: string }>('/api/health');
  return data;
}

export const api = {
  tryOn,
  uploadPhoto,
  generateAvatar,
  getJobStatus,
  pollJobUntilComplete,
  validateApiKey,
  generateDesign,
  healthCheck,
};
