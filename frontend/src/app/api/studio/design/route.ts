import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { uploadToR2 } from '@/lib/r2';
import { getClientIp, checkIpLimit, incrementIpCount } from '@/lib/ipRateLimit';

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

async function persistResultImage(imageUrl: string, userId: string, supabase: any): Promise<string> {
  try {
    console.log(`[Design Persist] Fetching image from: ${imageUrl.slice(0, 50)}...`);
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      console.error(`[Design Persist] Failed to fetch source image: ${res.status}`);
      return imageUrl;
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/png';
    const ext = contentType.split('/')[1]?.split(';')[0] || 'png';
    const filename = `design_results/${userId}_${Date.now()}.${ext}`;

    // 1. Try Cloudflare R2
    const r2Url = await uploadToR2(buffer, filename, contentType);
    if (r2Url) {
      console.log(`[Design Persist] Successfully saved to R2: ${filename}`);
      return r2Url;
    }

    // 2. Try Supabase Storage (Bucket: avatars)
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filename, arrayBuffer, { contentType, upsert: true });
    
    if (uploadError) {
      console.error(`[Design Persist] Supabase Upload Error:`, uploadError);
      return imageUrl;
    }

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filename);
    console.log(`[Design Persist] Successfully saved to Supabase: ${filename}`);
    return publicData?.publicUrl || imageUrl;
  } catch (err: any) { 
    console.error(`[Design Persist] Critical Error:`, err.message);
    return imageUrl; 
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const clientIp = getClientIp(req);
  const isMarketplaceRequest = !!req.headers.get('x-vexa-key');

  try {
    const body = (await req.json()) as DesignRequest;
    const { userId = 'anonymous', prompt, style, category = 'tops', designPrompt } = body;

    // 1. IP Rate Limit Check (3 per 24h for Design)
    if (!isMarketplaceRequest) {
      const ipCheck = await checkIpLimit(clientIp, 'design');
      if (!ipCheck.allowed) {
        return NextResponse.json({ 
          error: 'Free trial limit reached',
          message: 'You have used all 3 of your free designs for today. Your limit will reset automatically in 24 hours.',
          limitReached: true,
          remaining: 0
        }, { status: 429 });
      }
    }

    if (!prompt?.trim() || prompt.trim().length < 3) {
      return NextResponse.json({ error: 'Prompt must be at least 3 characters' }, { status: 400 });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 500 });

    // 2. Generate descriptive prompt
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
            { role: 'system', content: 'Fashion prompt engineer: Write a vivid garment description for a DALL-E 3 flat-lay product image. No people, no models. Under 800 chars.' },
            { role: 'user', content: `Garment: ${prompt.trim()}\nStyle: ${style ?? 'modern'}\nCategory: ${category}` },
          ],
        }),
      });
      const chatData = await chatRes.json();
      finalDesignPrompt = chatData.choices?.[0]?.message?.content?.trim() ?? prompt.trim();
    }

    const sanitizedPrompt = finalDesignPrompt.slice(0, 850);
    const generationPrompt = `Top-down overhead flat lay photograph of a ${sanitizedPrompt}, clean white background, bird's-eye view, crisp studio lighting, no people.`;

    // 3. Generate Image using SEEDREAM (BytePlus Ark)
    const seedreamKey = process.env.SEEDREAM_API_KEY;
    const seedreamEndpoint = process.env.SEEDREAM_ENDPOINT || 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations';
    const seedreamModel = process.env.SEEDREAM_MODEL || 'seedream-4-0-250828';

    let imageUrl: string | undefined;

    if (seedreamKey) {
      try {
        const seedreamRes = await fetch(seedreamEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${seedreamKey.trim()}` },
          body: JSON.stringify({
            model: seedreamModel,
            prompt: generationPrompt,
            sequential_image_generation: 'disabled',
            response_format: 'url',
            size: '2K',
            stream: false,
            watermark: false
          }),
          signal: AbortSignal.timeout(90_000),
        });
        if (!seedreamRes.ok) {
          const errText = await seedreamRes.text().catch(() => '');
          console.error(`[Design] Seedream HTTP ${seedreamRes.status}:`, errText.slice(0, 200));
        } else {
          const data = await seedreamRes.json();
          imageUrl = data.data?.[0]?.url || data.url || data.image_url;
          if (!imageUrl) console.warn('[Design] Seedream OK but no URL in response:', JSON.stringify(data).slice(0, 200));
        }
      } catch (e) { console.warn('[Design] Seedream exception:', e); }
    } else {
      console.warn('[Design] SEEDREAM_API_KEY not set — skipping Seedream');
    }

    // 4. Fallback to OpenAI DALL-E 3
    if (!imageUrl) {
      try {
        console.log('[Design] Trying DALL-E fallback...');
        const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey.trim()}` },
          body: JSON.stringify({ model: 'dall-e-3', prompt: generationPrompt, n: 1, size: '1024x1024' }),
          signal: AbortSignal.timeout(60_000),
        });
        if (!dalleResponse.ok) {
          const errText = await dalleResponse.text().catch(() => '');
          console.error(`[Design] DALL-E HTTP ${dalleResponse.status}:`, errText.slice(0, 200));
        } else {
          const data = await dalleResponse.json();
          imageUrl = data.data?.[0]?.url;
          if (!imageUrl) console.warn('[Design] DALL-E OK but no URL:', JSON.stringify(data).slice(0, 200));
        }
      } catch (e) { console.warn('[Design] DALL-E exception:', e); }
    }

    if (!imageUrl) throw new Error('Both Seedream and DALL-E failed — check API keys and logs');

    // 5. Increment Usage (Only if successful)
    if (!isMarketplaceRequest) {
      await incrementIpCount(clientIp, 'design').catch(e => console.warn('Limit increment failed', e));
    }

    // 6. Persistence (History)
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
      } catch (e) { console.warn('History save failed', e); }
    });

    return NextResponse.json({ designImageUrl: imageUrl, prompt: finalDesignPrompt });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
