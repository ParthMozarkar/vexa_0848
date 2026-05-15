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

function describeAssetUrl(url: string): string {
  if (url.startsWith('data:')) {
    const mime = url.slice(5).split(';')[0] || 'unknown';
    return `data:${mime};length=${url.length}`;
  }

  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return url.slice(0, 80);
  }
}

function assertPublicAssetUrl(url: string, label: string): void {
  try {
    const parsed = new URL(url);
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length >= 3) {
      return;
    }
  } catch {
    // handled below
  }

  throw new Error(
    `Could not prepare ${label} image for AI try-on. ` +
    `Expected a public HTTP URL, got ${describeAssetUrl(url)}. ` +
    'Check R2 credentials and Supabase environment variables, then retry.'
  );
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
  const isDataUrl = url.startsWith('data:');

  try {
    let buffer: Buffer;
    let mime: string;
    let ext: string;

    if (isDataUrl) {
      const [meta, b64] = url.split(',');
      if (!b64) {
        throw new Error(`${label} data URL is missing base64 image data`);
      }
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

    // Ensure the bucket exists (idempotent — error is ignored when it already exists)
    await supabase.storage.createBucket('avatars', { public: true }).catch(() => {});

    const { error: storageError } = await supabase.storage
      .from('avatars')
      .upload(filename, buffer, { contentType: mime, upsert: true });

    if (storageError) {
      throw new Error(`Supabase Storage upload failed: ${storageError.message}`);
    }

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filename);
    if (publicData?.publicUrl) return publicData.publicUrl;

    throw new Error('Supabase Storage did not return a public URL');
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.warn(`resolveToPublicUrl: failed to publish ${label} image:`, message);
    if (isDataUrl) {
      throw new Error(
        `Could not upload ${label} image to a public URL. ` +
        'Fix R2 credentials or Supabase Storage/service-role environment variables before retrying.'
      );
    }
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
    if (!res.ok) {
      logger.warn('persistResultImage: result fetch failed:', res.status);
      return imageUrl;
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/png';
    const ext = contentType.split('/')[1]?.split(';')[0] || 'png';
    const filename = `studio/tryons/${userId}_${productId}_${Date.now()}.${ext}`;

    const r2Url = await uploadToR2(buffer, filename, contentType);
    if (r2Url) return r2Url;

    const { error: storageError } = await supabase.storage
      .from('avatars')
      .upload(filename, buffer, { contentType, upsert: true });

    if (storageError) {
      logger.warn('persistResultImage: Supabase Storage upload failed:', storageError.message);
      return imageUrl;
    }

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filename);
    if (publicData?.publicUrl) return publicData.publicUrl;

    logger.warn('persistResultImage: Supabase Storage did not return a public URL');
    return imageUrl;
  } catch (e: unknown) {
    logger.warn('persistResultImage: failed, returning original AI URL:', e instanceof Error ? e.message : String(e));
    return imageUrl;
  }
}

// Removed executeTryOnProvider as logic is now inside TNBProvider class

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
  assertPublicAssetUrl(personUrlFinal, 'person');
  assertPublicAssetUrl(garmentUrlFinal, 'garment');
  console.info('[/api/tryon] resolved asset URLs:', {
    person: describeAssetUrl(personUrlFinal),
    garment: describeAssetUrl(garmentUrlFinal),
  });

  // 3. Orchestrated AI Call
  const orchestrationResult = await OrchestrationEngine.execute(
    'tryon',
    {
      personImageUrl: personUrlFinal,
      garmentImageUrl: garmentUrlFinal,
      category: (garmentEntry.category ?? category ?? 'tops') as TryOnCategory,
    },
    { preferLatency: true }
  );

  if (!orchestrationResult.success) {
    throw new Error(orchestrationResult.error || 'AI generation failed');
  }

  const resUrl = orchestrationResult.outputUrl;
  console.info('[/api/tryon] provider returned outputUrl:', resUrl);

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
