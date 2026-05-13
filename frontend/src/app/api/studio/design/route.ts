import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { uploadToR2 } from '@/lib/r2';

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

async function persistResultImage(imageUrl: string, userId: string, supabase: any): Promise<string> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return imageUrl;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/png';
    const ext = contentType.split('/')[1]?.split(';')[0] || 'png';
    const filename = `design_results/${userId}_${Date.now()}.${ext}`;

    // 1. Try Cloudflare R2 first
    const r2Url = await uploadToR2(buffer, filename, contentType);
    if (r2Url) return r2Url;

    // 2. Fallback to Supabase Storage
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filename, arrayBuffer, { contentType, upsert: true });
    if (!uploadError) {
      const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(filename, 86400 * 365);
      if (signed?.signedUrl) return signed.signedUrl;
    }
    return imageUrl;
  } catch { return imageUrl; }
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey.trim()}` },
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

    // 3. Generate Image using SEEDREAM (BytePlus Ark)
    const seedreamKey = process.env.SEEDREAM_API_KEY;
    const seedreamEndpoint = process.env.SEEDREAM_ENDPOINT || 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations';
    const seedreamModel = process.env.SEEDREAM_MODEL || 'seedream-4-0-250828';

    let imageUrl: string | undefined;

    if (seedreamKey) {
      try {
        console.log('[Seedream] Generating 2K design...');
        const seedreamRes = await fetch(seedreamEndpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${seedreamKey.trim()}` 
          },
          body: JSON.stringify({
            model: seedreamModel,
            prompt: generationPrompt,
            sequential_image_generation: 'disabled',
            response_format: 'url',
            size: '2K',
            stream: false,
            watermark: false
          }),
        });

        const data = await seedreamRes.json();
        // Seedream/Ark usually returns { data: [{ url: "..." }] } or { url: "..." }
        imageUrl = data.data?.[0]?.url || data.url || data.image_url;
        
        if (!imageUrl && !seedreamRes.ok) {
          console.error('[Seedream] Error:', JSON.stringify(data));
        }
      } catch (e) { 
        console.warn('[Seedream] Request failed, checking fallbacks...', e); 
      }
    }

    // 4. Fallback to OpenAI if Seedream fails (Ensures the app doesn't break)
    if (!imageUrl) {
      console.warn('[Design] Seedream failed, trying OpenAI DALL-E fallback...');
      try {
        const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey.trim()}` },
          body: JSON.stringify({ model: 'dall-e-3', prompt: generationPrompt, n: 1, size: '1024x1024' }),
        });
        const data = await dalleResponse.json();
        imageUrl = data.data?.[0]?.url;
      } catch (e) { console.warn('[Design] DALL-E fallback error', e); }
    }

    // 5. Try ANAKIN Fallback (Final Backup)
    const anakinKey = process.env.ANAKIN_API_KEY;
    if (!imageUrl && anakinKey) {
      try {
        const anakinRes = await fetch('https://api.anakin.ai/v1/quick_run', {
          method: 'POST',
          headers: { 'X-Anakin-Api-Key': anakinKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ appId: 'L9mjwX5v', inputs: { 'Prompt': generationPrompt } }),
        });
        const data = await anakinRes.json();
        imageUrl = data?.result || data?.outputs?.url || data?.outputs?.image;
      } catch (e) { console.warn('[Design] Anakin fallback failed', e); }
    }

    if (!imageUrl) {
      throw new Error('All image generation services failed. Please check your Seedream/OpenAI credits.');
    }

    // 6. PERSISTENCE: Save to permanent storage & history
    const supabase = getServiceSupabase();
    Promise.resolve().then(async () => {
      try {
        const persistedUrl = await persistResultImage(imageUrl!, userId, supabase);
        await (supabase.from('design_history') as any).insert({
          user_id: userId,
          original_prompt: prompt,
          ai_prompt: finalDesignPrompt,
          result_url: persistedUrl,
          category: category,
          style: style || 'modern',
          created_at: new Date().toISOString()
        });
        console.log('[/api/studio/design] Design history saved.');
      } catch (e) { console.warn('Failed to save design history', e); }
    });

    return NextResponse.json({ designImageUrl: imageUrl, prompt: finalDesignPrompt });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/studio/design] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
