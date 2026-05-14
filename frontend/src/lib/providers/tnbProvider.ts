
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

    const res = await fetch(`${TNB_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
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
    const { imageUrl, prompt } = input;
    const formData = new FormData();
    formData.append('image_url', this.fixUrl(imageUrl));
    formData.append('prompt', prompt || 'Elegant fashion motion');

    const res = await fetch(`${TNB_BASE}/vto_video`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: formData,
      signal,
    });

    if (!res.ok) throw new Error(`TNB Video Error: ${res.status}`);
    return this.parseResponse(await res.text());
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
