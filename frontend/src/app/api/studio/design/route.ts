import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';
import { uploadToR2 } from '@/lib/r2';
import { getClientIp, checkIpLimit, incrementIpCount } from '@/lib/ipRateLimit';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 120;

function getServiceSupabase(): SupabaseClient<Database> {
  return createServerSupabaseClient();
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
  // Skip if already a data URI (e.g. OpenAI b64_json path)
  if (imageUrl.startsWith('data:')) return imageUrl;

  let buffer: Buffer | null = null;
  let contentType = 'image/png';

  try {
    console.log(`[Design Persist] Fetching image from: ${imageUrl.slice(0, 80)}...`);
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      console.error(`[Design Persist] Failed to fetch source image: ${res.status}`);
    } else {
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = res.headers.get('content-type') || 'image/png';
      const ext = contentType.split('/')[1]?.split(';')[0] || 'png';
      const filename = `design_results/${userId}_${Date.now()}.${ext}`;

      // 1. Try Cloudflare R2
      const r2Url = await uploadToR2(buffer, filename, contentType);
      if (r2Url) {
        console.log(`[Design Persist] Successfully saved to R2: ${filename}`);
        return r2Url;
      }

      // 2. Try Supabase Storage (Bucket: avatars)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, arrayBuffer, { contentType, upsert: true });

      if (uploadError) {
        console.warn(`[Design Persist] Supabase upload failed:`, uploadError.message);
      } else {
        const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filename);
        if (publicData?.publicUrl) {
          console.log(`[Design Persist] Successfully saved to Supabase: ${filename}`);
          return publicData.publicUrl;
        }
      }
    }
  } catch (err: any) {
    console.error(`[Design Persist] Fetch/upload error:`, err.message);
  }

  // 3. Last resort: return as base64 data URI so the browser can always display
  //    the image regardless of CDN domain (bypasses the proxy allowlist entirely).
  if (buffer) {
    console.warn('[Design Persist] Falling back to base64 data URI');
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }

  // If we couldn't even fetch the image, return the original URL and let the
  // client-side proxy attempt it (may still fail, but is the best we can do).
  return imageUrl;
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

    // 3. Generate Image using SEEDREAM (BytePlus Ark) — try primary key, then fallback key
    const seedreamKeys = [process.env.SEEDREAM_API_KEY, process.env.SEEDREAM_API_KEY_2].filter(
      (k): k is string => Boolean(k && k.trim())
    );
    const seedreamEndpoint = process.env.SEEDREAM_ENDPOINT || 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations';
    const seedreamModel = process.env.SEEDREAM_MODEL || 'seedream-4-0-250828';

    let imageUrl: string | undefined;

    if (seedreamKeys.length === 0) {
      console.warn('[Design] No SEEDREAM_API_KEY set — skipping Seedream');
    }

    for (let i = 0; i < seedreamKeys.length && !imageUrl; i++) {
      const key = seedreamKeys[i];
      try {
        console.log(`[Design] Trying Seedream key #${i + 1}...`);
        const seedreamRes = await fetch(seedreamEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key.trim()}` },
          body: JSON.stringify({
            model: seedreamModel,
            prompt: generationPrompt,
            sequential_image_generation: 'disabled',
            response_format: 'url',
            size: '2K',
            stream: false,
            watermark: false,
          }),
          signal: AbortSignal.timeout(90_000),
        });
        if (!seedreamRes.ok) {
          const errText = await seedreamRes.text().catch(() => '');
          console.error(`[Design] Seedream key #${i + 1} HTTP ${seedreamRes.status}:`, errText.slice(0, 300));
          continue;
        }
        const data = await seedreamRes.json();
        imageUrl = data.data?.[0]?.url || data.url || data.image_url;
        if (!imageUrl) {
          console.warn(`[Design] Seedream key #${i + 1} OK but no URL:`, JSON.stringify(data).slice(0, 200));
        } else {
          console.log(`[Design] Seedream key #${i + 1} succeeded`);
        }
      } catch (e) {
        console.warn(`[Design] Seedream key #${i + 1} exception:`, e);
      }
    }

    // 4. Fallback to OpenAI gpt-image-1 (DALL-E 3 deprecated)
    if (!imageUrl) {
      try {
        console.log('[Design] Trying OpenAI gpt-image-1 fallback...');
        const openaiImgRes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey.trim()}` },
          body: JSON.stringify({ model: 'gpt-image-1', prompt: generationPrompt, n: 1, size: '1024x1024' }),
          signal: AbortSignal.timeout(120_000),
        });
        if (!openaiImgRes.ok) {
          const errText = await openaiImgRes.text().catch(() => '');
          console.error(`[Design] OpenAI image HTTP ${openaiImgRes.status}:`, errText.slice(0, 300));
        } else {
          const data = await openaiImgRes.json();
          const item = data.data?.[0];
          if (item?.url) {
            imageUrl = item.url;
          } else if (item?.b64_json) {
            imageUrl = `data:image/png;base64,${item.b64_json}`;
          } else {
            console.warn('[Design] OpenAI image OK but no url/b64:', JSON.stringify(data).slice(0, 200));
          }
        }
      } catch (e) { console.warn('[Design] OpenAI image exception:', e); }
    }

    if (!imageUrl) throw new Error('Both Seedream and OpenAI image generation failed — check API keys and logs');

    // 5. Increment Usage (Only if successful)
    if (!isMarketplaceRequest) {
      await incrementIpCount(clientIp, 'design').catch(e => console.warn('Limit increment failed', e));
    }

    // 6. Persistence — await so we return a stable R2/Supabase URL instead of
    //    an expiring external CDN link (Seedream / OpenAI signed URLs expire).
    const supabase = getServiceSupabase();
    let finalImageUrl = imageUrl;
    try {
      finalImageUrl = await persistResultImage(imageUrl!, userId, supabase);
      await (supabase.from('design_history') as any).insert({
        user_id: userId,
        original_prompt: prompt,
        ai_prompt: finalDesignPrompt,
        result_url: finalImageUrl,
        category: category,
        style: style || 'modern',
        created_at: new Date().toISOString()
      });
    } catch (e) { console.warn('History save failed', e); }

    return NextResponse.json({ designImageUrl: finalImageUrl, prompt: finalDesignPrompt });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
