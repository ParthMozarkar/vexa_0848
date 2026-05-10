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
      const systemMsg = `You are a fashion product prompt engineer.
Write a highly detailed, vivid garment description for AI flat-lay product image generation.
Rules: describe only the clothing item — fabric, texture, color, pattern, cut, fit, key design details.
Incorporate trend context if provided. Keep under 350 characters. Output only the description.`;

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

    // DALL-E 3: isolated flat-lay garment, no model
    const dallePrompt = `Professional e-commerce product photography of ${finalDesignPrompt}. The garment is laid flat on a pure white background. No person, no model, no mannequin, no human body. Only the clothing item itself as a flat-lay product shot. Studio lighting, high resolution, sharp fabric texture detail.`;

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
