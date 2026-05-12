import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface DesignRequest {
  prompt: string;
  style?: string;
  category?: string;
  trendContext?: string;
  designPrompt?: string;
}

interface DesignResponse {
  designImageUrl: string;
  prompt: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as DesignRequest;
    const { prompt, style, category = 'tops', trendContext, designPrompt } = body;

    if (!prompt?.trim() || prompt.trim().length < 3) {
      return NextResponse.json({ error: 'Prompt must be at least 3 characters' }, { status: 400 });
    }
    if (prompt.length > 500) {
      return NextResponse.json({ error: 'Prompt must be under 500 characters' }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // Use trend's designPrompt if provided, else build one via GPT-4o-mini
    let finalDesignPrompt: string;
    if (designPrompt) {
      finalDesignPrompt = designPrompt;
    } else {
      const systemMsg = `You are a fashion product prompt engineer specializing in flat-lay e-commerce photography prompts.
Write a vivid garment description for DALL-E 3 flat-lay product image generation.
Rules:
- Describe only the clothing item: fabric, texture, color, palette, print/pattern, cut, construction details
- Include visual characteristics that translate well to overhead flat-lay photography (e.g. "bold graphic print", "ribbed cotton", "washed indigo denim")
- Incorporate trend context if provided
- Do NOT mention people, models, mannequins, or bodies
- Keep under 300 characters
- Output only the description, nothing else`;

      const userMsg = `Garment: ${prompt.trim()}
Style: ${style ?? 'modern'}
Category: ${category}
${trendContext ? `Trend context: ${trendContext}` : ''}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });
      finalDesignPrompt = completion.choices[0]?.message?.content?.trim() ?? prompt.trim();
    }

    // DALL-E 3: strict flat-lay, overhead shot, no model
    const dallePrompt = `Top-down overhead flat lay photograph of a ${finalDesignPrompt}, lying perfectly flat on a clean white surface. Camera directly above, 90-degree bird's-eye view. Crisp product photography with even studio lighting. The garment fills most of the frame. Plain white background only. No shadows under edges. No people, no body parts, no hands, no table edges visible.`;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: dallePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural',
    });

    const imageUrl = (response.data ?? [])[0]?.url;
    if (!imageUrl) throw new Error('DALL-E 3 returned no image URL');

    return NextResponse.json({
      designImageUrl: imageUrl,
      prompt: finalDesignPrompt,
    } satisfies DesignResponse);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/studio/design]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
