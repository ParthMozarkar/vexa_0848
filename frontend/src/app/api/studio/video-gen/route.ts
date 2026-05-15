import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const TNB_BASE = 'https://thenewblack.ai/api/1.1/wf';
const FETCH_TIMEOUT_MS = 45_000;

interface VideoSubmitResponse {
  jobId: string;
  status: 'processing';
}

interface VideoPollResponse {
  status: 'processing' | 'ready';
  videoUrl?: string;
}

function getTNBApiKey(): string {
  const apiKey = (process.env.TNB_API_KEY || process.env.NEWBLACK_API_KEY)?.trim();
  if (!apiKey) {
    throw new Error('TNB_API_KEY is not set in environment variables.');
  }
  if (apiKey.length < 10) {
    throw new Error('TNB_API_KEY appears invalid (too short).');
  }
  return apiKey;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asValidUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('http')) return null;
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

function parseJobId(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('TNB Video: empty job id response');

  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>;
      const id = json.id || json.job_id || json.jobId || json.response;
      if (typeof id === 'string' && id.trim()) return id.trim();
      const message = typeof json.message === 'string' ? json.message : 'missing job id';
      throw new Error(`TNB Video: ${message}`);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('TNB Video:')) throw err;
    }
  }

  if (trimmed.includes('"status"')) {
    throw new Error(`TNB Video: invalid job id response: ${trimmed.slice(0, 200)}`);
  }

  return trimmed;
}

function parsePoll(body: string): VideoPollResponse {
  const trimmed = body.trim();
  console.log('[TNB Video] Poll response preview:', trimmed.slice(0, 500));

  if (!trimmed || /^processing/i.test(trimmed)) {
    return { status: 'processing' };
  }

  const plainUrl = asValidUrl(trimmed);
  if (plainUrl) return { status: 'ready', videoUrl: plainUrl };

  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>;
      const status = typeof json.status === 'string' ? json.status.toLowerCase() : '';
      if (status === 'processing' || status === 'pending' || status === 'queued') {
        return { status: 'processing' };
      }
      if (status === 'error' || json.error) {
        throw new Error(
          (json.message as string) ||
          (json.error as string) ||
          'TNB Video returned error status'
        );
      }

      const data = isRecord(json.data) ? json.data : undefined;
      const url =
        asValidUrl(json.response) ||
        asValidUrl(json.url) ||
        asValidUrl(json.videoUrl) ||
        asValidUrl(json.video_url) ||
        asValidUrl(json.output_url) ||
        asValidUrl(json.output) ||
        asValidUrl(data?.url) ||
        asValidUrl(data?.videoUrl) ||
        asValidUrl(data?.video_url);

      if (url) return { status: 'ready', videoUrl: url };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('TNB Video returned error')) {
        throw err;
      }
    }
  }

  const embeddedUrl = trimmed.match(/https?:\/\/[^\s"'<>]+/)?.[0];
  const extractedUrl = asValidUrl(embeddedUrl);
  if (extractedUrl) return { status: 'ready', videoUrl: extractedUrl };

  throw new Error(`TNB Video unknown poll response: ${trimmed.slice(0, 200)}`);
}

export async function POST(req: NextRequest): Promise<NextResponse<VideoSubmitResponse | { error: string }>> {
  try {
    const raw = (await req.json()) as unknown;
    if (!isRecord(raw) || typeof raw.imageUrl !== 'string' || !raw.imageUrl.trim()) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const apiKey = getTNBApiKey();
    const prompt =
      typeof raw.prompt === 'string' && raw.prompt.trim()
        ? raw.prompt.trim()
        : 'Elegant fashion motion, smooth dynamic movement';

    const formData = new FormData();
    formData.append('image', raw.imageUrl.trim());
    formData.append('prompt', prompt);
    formData.append('time', '5');

    const res = await fetch(`${TNB_BASE}/ai-video?api_key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const body = await res.text();
    console.log('[TNB Video] Submit status:', res.status);
    console.log('[TNB Video] Submit response preview:', body.slice(0, 500));

    if (!res.ok) {
      throw new Error(`TNB Video submit ${res.status}: ${body.slice(0, 200)}`);
    }

    return NextResponse.json({ jobId: parseJobId(body), status: 'processing' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/studio/video-gen] submit', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse<VideoPollResponse | { error: string }>> {
  try {
    const jobId = req.nextUrl.searchParams.get('jobId')?.trim();
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const apiKey = getTNBApiKey();
    const formData = new FormData();
    formData.append('id', jobId);

    const res = await fetch(`${TNB_BASE}/results_video?api_key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const body = await res.text();
    console.log('[TNB Video] Poll status:', res.status);

    if (!res.ok) {
      throw new Error(`TNB Video poll ${res.status}: ${body.slice(0, 200)}`);
    }

    return NextResponse.json(parsePoll(body));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/studio/video-gen] poll', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
