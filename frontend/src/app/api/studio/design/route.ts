import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export const runtime = 'nodejs';
export const maxDuration = 120;

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables missing');
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

interface DesignRequest {
  userId?: string;
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
    const { userId = 'anonymous', prompt, style, category = 'tops', trendContext, designPrompt } = body;

    if (!prompt?.trim() || prompt.trim().length < 3) {
      return NextResponse.json({ error: 'Prompt must be at least 3 characters' }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    // 1. Generate a descriptive prompt for the image
    let finalDesignPrompt: string;
    if (designPrompt) {
      finalDesignPrompt = designPrompt;
    } else {
      const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${openaiKey.trim()}` 
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a fashion prompt engineer. Write a vivid garment description for a DALL-E 3 flat-lay product image. No people, no models. Output only the description.' },
            { role: 'user', content: `Garment: ${prompt.trim()}\nStyle: ${style ?? 'modern'}\nCategory: ${category}` },
          ],
        }),
      });
      const chatData = await chatRes.json();
      finalDesignPrompt = chatData.choices?.[0]?.message?.content?.trim() ?? prompt.trim();
    }

    // 2. Define the image generation prompt (Slicing to ensure we never hit the 1000 char OpenAI limit)
    const sanitizedPrompt = finalDesignPrompt.slice(0, 850);
    const generationPrompt = `Top-down overhead flat lay photograph of a ${sanitizedPrompt}, clean white background, bird's-eye view, crisp studio lighting, no people.`;

    // 3. Generate Image (DALL-E 3)
    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${openaiKey.trim()}` 
      },
      body: JSON.stringify({ 
        model: 'dall-e-3', 
        prompt: generationPrompt, 
        n: 1, 
        size: '1024x1024' 
      }),
    });

    let dalleData = await dalleResponse.json();

    // 4. Fallback to DALL-E 2 if needed
    if (!dalleResponse.ok || !dalleData.data?.[0]?.url) {
      console.warn('DALL-E 3 failed, trying DALL-E 2 fallback...', JSON.stringify(dalleData));
      const fallbackRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${openaiKey.trim()}` 
        },
        body: JSON.stringify({ 
          model: 'dall-e-2', 
          prompt: generationPrompt, 
          n: 1, 
          size: '1024x1024' 
        }),
      });
      dalleData = await fallbackRes.json();
    }

    const imageUrl = dalleData.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error(dalleData.error?.message || 'Design generation failed.');
    }

    // 5. Save to History (Fire-and-forget)
    const supabase = getServiceSupabase();
    Promise.resolve().then(async () => {
      try {
        await (supabase.from('design_history') as any).insert({
          user_id: userId,
          original_prompt: prompt,
          ai_prompt: finalDesignPrompt,
          result_url: imageUrl,
          category: category,
          style: style || 'modern',
          created_at: new Date().toISOString()
        });
      } catch (e) { console.error('Failed to save design history:', e); }
    });

    return NextResponse.json({ 
      designImageUrl: imageUrl, 
      prompt: finalDesignPrompt 
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/studio/design] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
