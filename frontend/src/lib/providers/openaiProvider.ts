import type { AIProvider, ProviderCapability, ProviderCallOptions, ProviderHealthResult } from './types';

export interface OpenAIInput {
  type: 'image' | 'text';
  prompt: string;
  model?: string;
}

export interface OpenAIOutput {
  url?: string;
  text?: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface ImageGenerationResponse {
  data?: Array<{ url?: string }>;
}

export class OpenAIProvider implements AIProvider<OpenAIInput, OpenAIOutput> {
  readonly name = 'OpenAI';
  readonly capabilities: ProviderCapability[] = ['design', 'trends'];

  async call(input: OpenAIInput, options?: ProviderCallOptions): Promise<OpenAIOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const timeoutMs = options?.timeoutMs ?? 60_000;
    const signal = options?.signal ?? AbortSignal.timeout(timeoutMs);

    if (input.type === 'image') {
      const model = input.model ?? 'dall-e-3';
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          prompt: input.prompt,
          n: 1,
          size: '1024x1024',
        }),
        signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`OpenAI image generation failed (${res.status}): ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as ImageGenerationResponse;
      const url = data.data?.[0]?.url;
      if (!url) throw new Error('OpenAI returned success but no image URL');
      return { url };
    }

    // type === 'text'
    const model = input.model ?? 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: input.prompt }],
      }),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`OpenAI chat completion failed (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as ChatCompletionResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('OpenAI returned success but no text content');
    return { text };
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { healthy: false, latencyMs: 0, error: 'OPENAI_API_KEY not configured' };
    }

    const start = Date.now();
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
        signal: AbortSignal.timeout(5_000),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        return { healthy: false, latencyMs, error: `HTTP ${res.status}` };
      }
      return { healthy: true, latencyMs };
    } catch (e: unknown) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
