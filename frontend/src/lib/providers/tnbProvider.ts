
import { AIProvider, ProviderType } from '../orchestration/types';
import { TryOnCategory } from '@/types';

export interface TNBInput {
  personImageUrl: string;
  garmentImageUrl: string;
  category: TryOnCategory;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const TNB_BASE = 'https://thenewblack.ai/api/1.1/wf';

export class TNBProvider implements AIProvider {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: ProviderType,
    public readonly costPerCall: number,
    public readonly expectedLatencyMs: number,
    public weight: number = 1.0,
    public enabled: boolean = true
  ) {}

  async call(input: any, options?: { timeoutMs?: number; signal?: AbortSignal }): Promise<string> {
    const apiKey = process.env.TNB_API_KEY || process.env.NEWBLACK_API_KEY;
    if (!apiKey) throw new Error('AI service not configured');

    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const signal = options?.signal ?? AbortSignal.timeout(timeoutMs);

    // Handle both TryOn and VideoGen
    if (this.type === 'tryon') {
      return this.handleTryOn(input, apiKey, signal);
    } else if (this.type === 'video-gen') {
      return this.handleVideoGen(input, apiKey, signal);
    }
    
    throw new Error(`Method not implemented for ${this.type}`);
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

    const res = await fetch(`${TNB_BASE}/${endpoint}?api_key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`TNB Error (${res.status}): ${errText.slice(0, 200)}`);
    }
    
    return this.parseResponse(await res.text());
  }

  private async handleVideoGen(input: any, apiKey: string, signal: AbortSignal): Promise<string> {
    const { imageUrl, prompt, duration } = input;
    const time = duration === '10' ? '10' : '5';

    // Step 1: submit job
    const submitForm = new FormData();
    submitForm.append('image', this.fixUrl(imageUrl));
    submitForm.append('prompt', prompt || 'Elegant fashion motion, smooth dynamic movement');
    submitForm.append('time', time);

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

  private parseResponse(text: string): string {
    const trimmed = text.trim();
    if (trimmed.startsWith('http')) return trimmed;
    if (trimmed.startsWith('//')) return 'https:' + trimmed;
    if (trimmed.startsWith('{')) {
      try {
        const json = JSON.parse(trimmed);
        if (json.status === 'error') throw new Error(json.message || 'AI failed');
        const url = json.response || json.url || json.output_url || json.image;
        if (url?.startsWith('http')) return url.trim();
      } catch (e: any) {
        if (e.message.startsWith('AI ')) throw e;
      }
    }
    throw new Error('AI service unavailable');
  }
}
