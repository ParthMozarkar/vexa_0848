import type { AIProvider, ProviderCapability, ProviderCallOptions, ProviderHealthResult } from './types';

export interface BlackBoxInput {
  garmentImageUrl: string;
  modelGender?: 'male' | 'female';
}

export interface BlackBoxOutput {
  modelImageUrl: string;
}

const BLACKBOX_BASE_URL = 'https://api.blackbox.ai/api/v1/model-gen';

export class BlackBoxProvider implements AIProvider<BlackBoxInput, BlackBoxOutput> {
  readonly name = 'BlackBox';
  readonly capabilities: ProviderCapability[] = ['model-gen'];

  async call(input: BlackBoxInput, options?: ProviderCallOptions): Promise<BlackBoxOutput> {
    const apiKey = process.env.BLACKBOX_API_KEY;
    if (!apiKey) throw new Error('BLACKBOX_API_KEY not configured');

    const { garmentImageUrl, modelGender = 'female' } = input;
    const timeoutMs = options?.timeoutMs ?? 120_000;
    const signal = options?.signal ?? AbortSignal.timeout(timeoutMs);

    const form = new FormData();
    form.append('clothing_image', garmentImageUrl);
    form.append('gender', modelGender);

    const res = await fetch(BLACKBOX_BASE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown');
      throw new Error(`BlackBox model-gen failed (${res.status}): ${errText.slice(0, 200)}`);
    }

    const json = (await res.json()) as Record<string, unknown>;
    const modelImageUrl = json.output_url as string | undefined;
    if (!modelImageUrl) {
      throw new Error('BlackBox API returned success but no output_url');
    }

    return { modelImageUrl };
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const apiKey = process.env.BLACKBOX_API_KEY;
    if (!apiKey) {
      return { healthy: false, latencyMs: 0, error: 'BLACKBOX_API_KEY not configured' };
    }
    // No lightweight probe endpoint available — return healthy if key is present
    return { healthy: true, latencyMs: 0 };
  }
}
