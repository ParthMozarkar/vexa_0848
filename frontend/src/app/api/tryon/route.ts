/**
 * POST /api/tryon
 * Optimized Try-On Engine with Hedging (Parallel Requests) for <15s latency goals.
 */

import { NextRequest, NextResponse } from 'next/server';
import { type SupabaseClient } from '@supabase/supabase-js';
import { validateApiKey } from '@/lib/apiKeyMiddleware';
import type { MarketplaceContext, TryOnCategory } from '@/types';
import { uploadToR2 } from '@/lib/r2';
import { getClientIp, checkIpLimit, incrementIpCount } from '@/lib/ipRateLimit';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import type { HandleTryOnInput, HandleTryOnResult } from '@/lib/tryonContracts';
import { validateProxyUrl } from '@/lib/ssrfGuard';
import { logger } from '@/lib/logger';
import { OrchestrationEngine } from '@/lib/orchestration/OrchestrationEngine';
import { AIProvider } from '@/lib/orchestration/types';

export type { TryOnCategory } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const FETCH_TIMEOUT_MS = 120_000;

function getServiceSupabase(): SupabaseClient {
  return createServerSupabaseClient();
}

async function authenticateRequest(req: NextRequest, bodyUserId: string): Promise<{ userId: string; marketplace: MarketplaceContext | null } | NextResponse> {
  const marketplaceCtx = await validateApiKey(req);
  if (marketplaceCtx) {
    if (!bodyUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const supabase = getServiceSupabase();
    const { data: userRecord } = await supabase.from('users').select('marketplace_id').eq('id', bodyUserId).single();
    if (!userRecord) {
      if (marketplaceCtx.marketplaceId === 'mkt_dev') {
        await (supabase.from('users') as any).upsert({ id: bodyUserId, email: `${bodyUserId}@vexa.guest` });
        return { userId: bodyUserId, marketplace: marketplaceCtx };
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return { userId: bodyUserId, marketplace: marketplaceCtx };
  }
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const supabase = getServiceSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) return { userId: user.id, marketplace: null };
  }
  const guestId = bodyUserId || 'demo_user_001';
  const supabase = getServiceSupabase();
  await supabase.from('users').upsert({ id: guestId, email: `${guestId}@vexa.guest` } as never);
  return { userId: guestId, marketplace: null };
}

async function resolveToPublicUrl(url: string, label: string, userId: string, supabase: SupabaseClient): Promise<string> {
  if (!url) return '';

  try {
    const isDataUrl = url.startsWith('data:');
    let buffer: Buffer;
    let mime: string;
    let ext: string;

    if (isDataUrl) {
      const [meta, b64] = url.split(',');
      mime = meta?.slice(5).split(';')[0] || 'image/png';
      ext = mime.split('/')[1] || 'png';
      buffer = Buffer.from(b64, 'base64');
    } else {
      // SSRF guard: validate user-controlled URLs before fetching
      const urlValidation = validateProxyUrl(url);
      if (!urlValidation.valid) {
        logger.warn('resolveToPublicUrl: SSRF guard rejected URL:', urlValidation.reason);
        return url;
      }
      const res = await fetch(urlValidation.parsed.toString());
      if (!res.ok) return url;
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      mime = res.headers.get('content-type') || 'image/png';
      ext = mime.split('/')[1]?.split(';')[0] || 'png';
    }

    const filename = `studio/uploads/${label}/${userId}_${Date.now()}.${ext}`;

    const r2Url = await uploadToR2(buffer, filename, mime);
    if (r2Url) return r2Url;

    await supabase.storage.from('avatars').upload(filename, buffer, { contentType: mime, upsert: true });
    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filename);
    return publicData?.publicUrl || url;
  } catch (e) {
    return url;
  }
}

async function persistResultImage(imageUrl: string, userId: string, productId: string, supabase: SupabaseClient): Promise<string> {
  try {
    // TNB result URLs are trusted, but enforce https scheme before fetching
    let parsedResultUrl: URL;
    try {
      parsedResultUrl = new URL(imageUrl);
    } catch {
      logger.warn('persistResultImage: invalid URL format, skipping persist');
      return imageUrl;
    }
    if (parsedResultUrl.protocol !== 'https:') {
      logger.warn('persistResultImage: non-https URL rejected:', parsedResultUrl.protocol);
      return imageUrl;
    }
    const res = await fetch(parsedResultUrl.toString(), { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return imageUrl;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/png';
    const ext = contentType.split('/')[1]?.split(';')[0] || 'png';
    const filename = `studio/tryons/${userId}_${productId}_${Date.now()}.${ext}`;

    const r2Url = await uploadToR2(buffer, filename, contentType);
    if (r2Url) return r2Url;

    await supabase.storage.from('avatars').upload(filename, arrayBuffer, { contentType, upsert: true });
    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filename);
    return publicData?.publicUrl || imageUrl;
  } catch { return imageUrl; }
}

/**
 * Robust parser for TNB responses.
 * Handles JSON errors, plain text URLs, and protocol-relative URLs (//).
 */
function parseTNBResponse(responseText: string): string {
  const trimmed = responseText.trim();

  // Plain URL response (most common from vto_stream)
  if (trimmed.startsWith('http')) return trimmed;

  // Protocol-relative URL
  if (trimmed.startsWith('//')) return 'https:' + trimmed;

  // JSON response
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as Record<string, unknown>;
      if (json.status === 'error') throw new Error((json.message as string) || 'AI generation failed');
      const url = (json.response as string) || (json.url as string) || (json.output_url as string) || (json.image as string);
      if (url?.startsWith('http')) return url.trim();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'AI generation failed' || msg.startsWith('AI ')) throw e;
    }
  }

  logger.error('[TNB] Unexpected response', { preview: trimmed.slice(0, 120) });
  throw new Error('AI service is temporarily unavailable. Please try again.');
}

/**
 * Generic provider executor for Try-On
 */
async function executeTryOnProvider(provider: AIProvider, data: any): Promise<string> {
  const { personImageUrl, garmentImageUrl, category } = data;
  const apiKey = process.env.TNB_API_KEY || process.env.NEWBLACK_API_KEY; // Fallback to env for now

  if (provider.id.startsWith('tnb')) {
    const endpoint = category === 'shoes' ? 'vto-shoes' : 'vto_stream';
    const fixUrl = (u: string) => u.startsWith('//') ? `https:${u}` : u;
    
    const formData = new FormData();
    formData.append('model_photo', fixUrl(personImageUrl));
    if (category === 'shoes') {
      formData.append('shoes_photo', fixUrl(garmentImageUrl));
    } else {
      const promptText = category === 'bottoms' ? 'Put this bottom on' : 'Put this top on';
      formData.append('clothing_photo', fixUrl(garmentImageUrl));
      formData.append('prompt', promptText);
      formData.append('ratio', 'auto');
    }

    // OBS-05: Track start time for AI provider failure reporting
    const start = Date.now();

    const res = await fetch(`https://thenewblack.ai/api/1.1/wf/${endpoint}`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey || '',
      },
      body: formData,
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error('[TNB Error]', { status: res.status, body: errText.slice(0, 200) });
      // OBS-05: Capture AI provider failure to Sentry with full context
      logger.aiError('TNB', endpoint, { duration: Date.now() - start, status: res.status });
      throw new Error(`AI service error (${res.status})`);
    }
    return parseTNBResponse(await res.text());
  }

  // Fallback / Mock for other providers
  console.log(`[Mock] Executing ${provider.name} for ${category}`);
  return personImageUrl; // Just return input for mock
}

export async function handleTryOn(
  input: HandleTryOnInput,
  supabase: SupabaseClient,
): Promise<HandleTryOnResult> {
  const { userId, category, garments } = input;
  const userPhotoUrl = input.userPhotoUrl ?? (input as any).avatarGlbUrl ?? '';
  const productImageUrl = input.productImageUrl ?? (input as any).clothingGlbUrl ?? '';
  const productId = input.productId ?? `custom_${Date.now()}`;

  // 1. Parallel Asset Resolution (Saves 2-4s)
  const itemsToProcess =
    garments || (productImageUrl ? [{ url: productImageUrl, category: category ?? 'tops' }] : []);

  const garmentEntry = itemsToProcess[0];
  if (!userPhotoUrl?.trim()) {
    throw new Error('userPhotoUrl is required (or legacy avatarGlbUrl)');
  }
  if (!garmentEntry?.url?.trim()) {
    throw new Error('Garment image URL is required: pass productImageUrl, clothingGlbUrl, or garments[0].url');
  }

  // 2. Initial Resolution
  const [personUrlFinal, garmentUrlFinal] = await Promise.all([
    resolveToPublicUrl(userPhotoUrl, 'person', userId, supabase),
    resolveToPublicUrl(garmentEntry.url, 'garment', userId, supabase),
  ]);

  // 3. Orchestrated AI Call
  const orchestrationResult = await OrchestrationEngine.executeWithOrchestration(
    'tryon',
    {
      personImageUrl: personUrlFinal,
      garmentImageUrl: garmentUrlFinal,
      category: (garmentEntry.category ?? category ?? 'tops') as TryOnCategory,
    },
    executeTryOnProvider,
    { preferLatency: true, minQualityScore: 80 }
  );

  if (!orchestrationResult.success) {
    throw new Error(orchestrationResult.error || 'AI generation failed');
  }

  const resUrl = orchestrationResult.outputUrl;

  // 4. Persistence — await so we return the stable stored URL, not the short-lived TNB URL
  let finalUrl = resUrl;
  try {
    const persistedUrl = await persistResultImage(resUrl, userId, productId, supabase);
    if (persistedUrl && persistedUrl !== resUrl) finalUrl = persistedUrl;
    await (supabase.from('tryon_results') as any).upsert({
      user_id: userId,
      product_id: productId,
      user_photo_url: personUrlFinal,
      garment_url: garmentUrlFinal,
      product_image_url: garmentUrlFinal,
      result_url: finalUrl,
      fit_label: 'True to size',
      recommended_size: 'M',
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    logger.error('[/api/tryon] Persistence failed, returning raw URL', {}, e);
  }

  return {
    resultUrl: finalUrl,
    status: 'ready',
    fitLabel: 'True to size',
    recommendedSize: 'M',
    fitScore: 85,
    cached: false,
    storagePath: '',
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (req.headers.get('x-debug-ping') === 'true') {
    return NextResponse.json({ status: 'alive', time: new Date().toISOString() });
  }

  const clientIp = getClientIp(req);
  const supabase = getServiceSupabase();

  try {
    const { userId, userPhotoUrl, productImageUrl, productId, category, garments } = await req.json();

    // x-vexa-key = marketplace B2B request — not subject to IP limit
    const isMarketplaceRequest = !!req.headers.get('x-vexa-key');

    if (!isMarketplaceRequest) {
      const ipCheck = await checkIpLimit(clientIp, 'tryon');

      if (!ipCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Free trial limit reached',
            message: `You have used both of your free try-ons for today. Your limit will reset automatically in 24 hours.`,
            generationsRemaining: 0,
            limitReached: true,
          },
          { status: 429 }
        );
      }
    }

    const auth = await authenticateRequest(req, userId);
    if (auth instanceof NextResponse) return auth;

    const result = await handleTryOn({ userId: auth.userId, productId, userPhotoUrl, productImageUrl, category, garments }, supabase);

    if (!isMarketplaceRequest) {
      await incrementIpCount(clientIp, 'tryon').catch((e: Error) =>
        logger.warn('[tryon] IP increment failed:', e.message)
      );
    }

    let generationsRemaining: number | null = null;
    if (!isMarketplaceRequest) {
      const postCheck = await checkIpLimit(clientIp, 'tryon');
      generationsRemaining = postCheck.generationsRemaining;
    }

    return NextResponse.json({ ...result, generationsRemaining });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('[/api/tryon] ERROR', { message });
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
