
import { AIProvider, ProviderType } from '../orchestration/types';
import type { ProviderCapability, ProviderHealthResult } from './types';
import type { TryOnCategory } from '@/types';

export interface TNBInput {
  personImageUrl: string;
  garmentImageUrl: string;
  category: TryOnCategory;
}

interface TNBVideoInput {
  imageUrl: string;
  prompt?: string;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const TNB_BASE = 'https://thenewblack.ai/api/1.1/wf';

function parseTNBResponse(responseText: string): string {
  const trimmed = responseText.trim()

  const isValidUrl = (u: unknown): string | null => {
    if (typeof u !== 'string') return null
    let url = u.trim()
    if (url.startsWith('//')) url = 'https:' + url
    if (!url.startsWith('http')) return null
    if (url.length < 20) return null
    try {
      new URL(url)
      return url
    } catch {
      return null
    }
  }

  console.log('[TNB] Raw response preview:', trimmed.slice(0, 500))

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>

      if (json.status === 'error' || json.error) {
        throw new Error(
          (json.message as string) ||
          (json.error as string) ||
          'TNB returned error status'
        )
      }

      const data = json.data as Record<string, unknown> | undefined

      const url =
        isValidUrl(json.response) ||
        isValidUrl(json.url) ||
        isValidUrl(json.output_url) ||
        isValidUrl(json.image) ||
        isValidUrl(json.result) ||
        isValidUrl(json.output) ||
        isValidUrl(data?.url) ||
        isValidUrl(data?.image) ||
        isValidUrl(data?.response)

      if (url) return url

      console.error('[TNB] JSON parsed but no URL found. Keys:', Object.keys(json))
      throw new Error(
        `TNB response missing URL. Got keys: ${Object.keys(json).join(', ')}`
      )
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (
        msg.includes('TNB returned error') ||
        msg.includes('missing URL')
      ) throw e
    }
  }

  const plainUrl = isValidUrl(trimmed)
  if (plainUrl) return plainUrl

  const urlMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/)
  if (urlMatch?.[0]) {
    const extracted = isValidUrl(urlMatch[0])
    if (extracted) return extracted
  }

  console.error('[TNB] Full unparseable response:', trimmed)
  throw new Error(
    `AI service returned unparseable response: ${trimmed.slice(0, 200)}`
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTryOnCategory(value: unknown): value is TryOnCategory {
  return (
    value === 'tops' ||
    value === 'bottoms' ||
    value === 'one-pieces' ||
    value === 'shoes' ||
    value === 'bags' ||
    value === 'accessories' ||
    value === 'jewelry'
  )
}

function isTNBInput(input: unknown): input is TNBInput {
  return (
    isRecord(input) &&
    typeof input.personImageUrl === 'string' &&
    typeof input.garmentImageUrl === 'string' &&
    isTryOnCategory(input.category)
  )
}

function isTNBVideoInput(input: unknown): input is TNBVideoInput {
  return (
    isRecord(input) &&
    typeof input.imageUrl === 'string' &&
    (input.prompt === undefined || typeof input.prompt === 'string')
  )
}

export class TNBProvider implements AIProvider {
  public readonly capabilities: ProviderCapability[];

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: ProviderType,
    public readonly costPerCall: number,
    public readonly expectedLatencyMs: number,
    public weight: number = 1.0,
    public enabled: boolean = true
  ) {
    this.capabilities = type === 'video-gen' ? ['tryon-video'] : ['tryon'];
  }

  async call(input: unknown, options?: { timeoutMs?: number; signal?: AbortSignal }): Promise<string> {
    const apiKey = (process.env.TNB_API_KEY || process.env.NEWBLACK_API_KEY)?.trim()
    if (!apiKey) {
      throw new Error(
        'TNB_API_KEY is not set in environment variables. ' +
        'Go to Vercel dashboard → Settings → Environment Variables and add it.'
      )
    }

    if (apiKey.length < 10) {
      throw new Error(
        'TNB_API_KEY appears invalid (too short). Check Vercel environment variables.'
      )
    }

    console.info(`[TNB] using key len=${apiKey.length} prefix=${apiKey.slice(0, 4)}*** type=${this.type}`);

    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const signal = options?.signal ?? AbortSignal.timeout(timeoutMs);

    // Handle both TryOn and VideoGen
    if (this.type === 'tryon') {
      if (!isTNBInput(input)) throw new Error('Invalid TNB try-on input')
      return this.handleTryOn(input, apiKey, signal);
    } else if (this.type === 'video-gen') {
      if (!isTNBVideoInput(input)) throw new Error('Invalid TNB video input')
      return this.handleVideoGen(input, apiKey, signal);
    }
    
    throw new Error(`Method not implemented for ${this.type}`);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const start = Date.now();
    const apiKey = (process.env.TNB_API_KEY || process.env.NEWBLACK_API_KEY)?.trim();

    if (!apiKey) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: 'TNB_API_KEY is not set in environment variables.',
      };
    }

    if (apiKey.length < 10) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: 'TNB_API_KEY appears invalid (too short).',
      };
    }

    return { healthy: true, latencyMs: Date.now() - start };
  }

  private async handleTryOn(input: TNBInput, apiKey: string, signal: AbortSignal): Promise<string> {
    const { personImageUrl, garmentImageUrl, category } = input;
    const endpoint = category === 'shoes' ? 'vto-shoes' : 'vto_stream';

    const formData = new FormData();
    formData.append('model_photo', this.fixUrl(personImageUrl));

    if (category === 'shoes') {
      formData.append('shoes_photo', this.fixUrl(garmentImageUrl));
    } else {
      const promptText =
        category === 'bottoms' ? 'Put this bottom/pants on the model' :
        category === 'one-pieces' ? 'Put this dress/outfit on the model' :
        'Put this top/shirt on the model';

      formData.append('clothing_photo', this.fixUrl(garmentImageUrl));
      formData.append('prompt', promptText);
      formData.append('ratio', 'auto');
    }

    const res = await fetch(
      `${TNB_BASE}/${endpoint}?api_key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        body: formData,
        signal,
      }
    )

    const responseText = await res.text()

    console.log('[TNB] HTTP Status:', res.status)
    console.log('[TNB] Content-Type:', res.headers.get('content-type'))
    console.log('[TNB] Response preview:', responseText.slice(0, 500))

    if (!res.ok) {
      throw new Error(
        `TNB API failed with status ${res.status}: ${responseText.slice(0, 200)}`
      )
    }

    return parseTNBResponse(responseText)
  }

  private async handleVideoGen(input: TNBVideoInput, apiKey: string, signal: AbortSignal): Promise<string> {
    const { imageUrl, prompt } = input;

    // Strict 5s only (10 credits). 10s mode disabled to control TNB cost.
    const submitForm = new FormData();
    submitForm.append('image', this.fixUrl(imageUrl));
    submitForm.append('prompt', prompt || 'Elegant fashion motion, smooth dynamic movement');
    submitForm.append('time', '5');

    const submitRes = await fetch(`${TNB_BASE}/ai-video?api_key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      body: submitForm,
      signal,
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => '');
      throw new Error(`TNB Video submit ${submitRes.status}: ${errText.slice(0, 200)}`);
    }

    const jobId = (await submitRes.text()).trim();
    if (!jobId || jobId.includes('"status"')) {
      throw new Error(`TNB Video: invalid job id response: ${jobId.slice(0, 200)}`);
    }

    // Step 2: poll results_video until URL returned or signal aborts
    const pollIntervalMs = 5_000;
    while (true) {
      if (signal.aborted) throw new Error('TNB Video polling aborted (timeout)');
      await new Promise((r) => setTimeout(r, pollIntervalMs));

      const pollForm = new FormData();
      pollForm.append('id', jobId);
      const pollRes = await fetch(`${TNB_BASE}/results_video?api_key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        body: pollForm,
        signal,
      });
      if (!pollRes.ok) {
        const errText = await pollRes.text().catch(() => '');
        throw new Error(`TNB Video poll ${pollRes.status}: ${errText.slice(0, 200)}`);
      }
      const body = (await pollRes.text()).trim();
      if (!body) continue;
      if (/^processing/i.test(body)) continue;
      if (body.startsWith('http')) return body;
      // unknown payload — surface for debugging
      throw new Error(`TNB Video unknown poll response: ${body.slice(0, 200)}`);
    }
  }

  private fixUrl(u: string) { return u.startsWith('//') ? `https:${u}` : u; }
}
