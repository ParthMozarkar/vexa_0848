import type { TryOnCategory } from '@/types';
import type { AIProvider, ProviderCapability, ProviderCallOptions, ProviderHealthResult } from './types';

export interface TNBInput {
  personImageUrl: string;
  garmentImageUrl: string;
  category: TryOnCategory;
}

const FETCH_TIMEOUT_MS = 120_000;
const TNB_BASE = 'https://thenewblack.ai/api/1.1/wf';

function parseTNBResponse(responseText: string): string {
  const trimmed = responseText.trim();

  if (trimmed.startsWith('http')) return trimmed;

  if (trimmed.startsWith('//')) return 'https:' + trimmed;

  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>;
      if (json.status === 'error') throw new Error((json.message as string) || 'AI generation failed');
      const url =
        (json.response as string) ||
        (json.url as string) ||
        (json.output_url as string) ||
        (json.image as string);
      if (url?.startsWith('http')) return url.trim();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'AI generation failed' || msg.startsWith('AI ')) throw e;
    }
  }

  throw new Error('AI service is temporarily unavailable. Please try again.');
}

export class TNBProvider implements AIProvider<TNBInput, string> {
  readonly name = 'TNB';
  readonly capabilities: ProviderCapability[] = ['tryon', 'tryon-video'];

  async call(input: TNBInput, options?: ProviderCallOptions): Promise<string> {
    const apiKey = process.env.TNB_API_KEY || process.env.NEWBLACK_API_KEY;
    if (!apiKey) throw new Error('AI service not configured');

    const { personImageUrl, garmentImageUrl, category } = input;
    const endpoint = category === 'shoes' ? 'vto-shoes' : 'vto_stream';
    const timeoutMs = options?.timeoutMs ?? FETCH_TIMEOUT_MS;

    const runRequest = async (): Promise<string> => {
      const fixUrl = (u: string) => (u.startsWith('//') ? `https:${u}` : u);
      const pUrl = fixUrl(personImageUrl);
      const gUrl = fixUrl(garmentImageUrl);

      const formData = new FormData();
      formData.append('model_photo', pUrl);
      if (category === 'shoes') {
        formData.append('shoes_photo', gUrl);
      } else {
        const promptText =
          category === 'bottoms'
            ? 'Put this bottom/pants on the model'
            : category === 'one-pieces'
              ? 'Put this dress/outfit on the model'
              : 'Put this top/shirt on the model';
        formData.append('clothing_photo', gUrl);
        formData.append('prompt', promptText);
        formData.append('ratio', 'auto');
      }

      const signal = options?.signal ?? AbortSignal.timeout(timeoutMs);
      const res = await fetch(`${TNB_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey },
        body: formData,
        signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`AI service error (${res.status}): ${errText.slice(0, 200)}`);
      }
      return parseTNBResponse(await res.text());
    };

    // TAIL HEDGING: start 1st request, wait 3s, then start backup if 1st isn't done.
    return new Promise<string>((resolve, reject) => {
      let resolved = false;
      const errors: Error[] = [];

      const attempt = async () => {
        try {
          const result = await runRequest();
          if (!resolved) {
            resolved = true;
            resolve(result);
          }
        } catch (e: unknown) {
          const err = e instanceof Error ? e : new Error(String(e));
          errors.push(err);
          if (errors.length >= 2) {
            reject(new Error('AI service busy. Please try again in a moment.'));
          }
        }
      };

      attempt();
      setTimeout(() => {
        if (!resolved) attempt();
      }, 3000);

      setTimeout(() => {
        if (!resolved) reject(new Error('Generation timed out'));
      }, timeoutMs);
    });
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const apiKey = process.env.TNB_API_KEY || process.env.NEWBLACK_API_KEY;
    if (!apiKey) {
      return { healthy: false, latencyMs: 0, error: 'TNB_API_KEY not configured' };
    }
    // No lightweight probe endpoint — return healthy if key is present
    return { healthy: true, latencyMs: 0 };
  }
}
