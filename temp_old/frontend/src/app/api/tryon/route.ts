/**
 * POST /api/tryon
 * Core try-on engine. Accepts user photo + product image, returns AI-generated result.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isRateLimited } from '@/lib/rateLimit';
import { validateApiKey } from '@/lib/apiKeyMiddleware';
import { getFitRecommendation, getFitScore } from '@/lib/fitEngine';
import type { MarketplaceContext } from '@/types';
import type { ClothingAssetRow, Database, UserRow, TryOnResultRow } from '@/types/database';
import { uploadToR2 } from '@/lib/r2';
import { startFashnTryOn, pollFashnResult } from '@/lib/fashn';

// ─── SSRF Protection ──────────────────────────────────────────────────────────

const ALLOWED_STORAGE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin; } catch { return null; } })()
  : null;

function validateSecureUrl(url: string, description: string): string {
  if (!url) throw new Error(`${description} is required`);

  // data: and blob: URLs are local — no origin to validate, allow immediately
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${description} is not a valid URL`);
  }

  if (ALLOWED_STORAGE_ORIGIN) {
    const allowedOrigins = [
      ALLOWED_STORAGE_ORIGIN,
      'https://images.unsplash.com',
      'https://cdn.shopify.com',
    ];
    const isAllowed =
      allowedOrigins.some((o) => parsed.origin === o) ||
      parsed.origin.endsWith('.supabase.co');

    if (!isAllowed) {
      throw new Error(`${description} origin not allowed: ${parsed.origin}`);
    }
  }
  return url;
}

// ─── Supabase helper ──────────────────────────────────────────────────────────

function getServiceSupabase(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables missing');
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

interface AuthResult {
  userId: string;
  marketplace: MarketplaceContext | null;
}

async function authenticateRequest(req: NextRequest, bodyUserId: string): Promise<AuthResult | NextResponse> {
  const marketplaceCtx = await validateApiKey(req);
  if (marketplaceCtx) {
    if (!bodyUserId) {
      return NextResponse.json({ error: 'userId is required for marketplace requests' }, { status: 400 });
    }
    const supabase = getServiceSupabase();
    const { data: userRecord } = await supabase
      .from('users')
      .select('marketplace_id')
      .eq('id', bodyUserId)
      .single() as any;

    if (!userRecord) {
      // Auto-provision guest user for the dev marketplace so local testing works.
      if (marketplaceCtx.marketplaceId === 'mkt_dev') {
        await (supabase.from('users') as any).upsert({ id: bodyUserId, email: `${bodyUserId}@vexa.guest` });
        return { userId: bodyUserId, marketplace: marketplaceCtx };
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (userRecord.marketplace_id && userRecord.marketplace_id !== marketplaceCtx.marketplaceId) {
      return NextResponse.json({ error: 'Forbidden: User does not belong to this marketplace' }, { status: 403 });
    }
    return { userId: bodyUserId, marketplace: marketplaceCtx };
  }

  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase environment variables missing');

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Bearer token' }, { status: 401 });
    }
    if (bodyUserId && bodyUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Cannot initiate try-on for another user' }, { status: 403 });
    }
    return { userId: user.id, marketplace: null };
  }

  // Dev-only guest fallback: allow unauthenticated requests when running locally.
  // NEVER matches in production (NODE_ENV === 'production').
  if (process.env.NODE_ENV !== 'production') {
    const guestId = bodyUserId || 'demo_user_001';
    const supabase = getServiceSupabase();
    await (supabase.from('users') as any).upsert({ id: guestId, email: `${guestId}@vexa.guest` });
    console.warn('[/api/tryon] Dev guest mode — bypassing auth for userId=%s', guestId);
    return {
      userId: guestId,
      marketplace: {
        marketplaceId: 'mkt_dev',
        name: 'Local Dev Guest',
        apiKey: 'dev-guest',
        createdAt: new Date().toISOString(),
      },
    };
  }

  return NextResponse.json({ error: 'Unauthorized: Valid Bearer token or API key required' }, { status: 401 });
}

// ─── Upload data URL to Supabase storage, return signed URL ──────────────────

async function uploadDataUrl(
  dataUrl: string,
  userId: string
): Promise<string | null> {
  // We first try R2 (as requested previously), but now we have a secondary 
  // path in handleTryOn that uploads to HF if this fails or is skipped.
  try {
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) return null;

    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `uploads/${userId}_${Date.now()}.png`;

    const publicUrl = await uploadToR2(buffer, filename, 'image/png');
    return publicUrl;
  } catch (e) {
    console.warn('[/api/tryon] Storage upload skipped/failed, will rely on direct HF upload');
    return null;
  }
}

/**
 * Converts a URL or Buffer to a base64 string formatted for Gradio Data injection.
 */
/** IDM-VTON HuggingFace Space garment category (queue `data[2]`).
 *  The Space exposes a radio input with literal values "upper_body",
 *  "lower_body", "dresses". Anything else returns 400 Bad Request. */
function idmVtonCategoryFromProductCategory(category: string | null | undefined): string {
  const c = (category ?? 'tops').toLowerCase();
  if (c === 'dresses') return 'dresses';
  if (c === 'bottoms' || c === 'shoes') return 'lower_body';
  return 'upper_body';
}

/** Upload one image buffer to the Space's `/upload` endpoint. Returns the
 *  server-side path you can hand back via `{ path, meta }` on `/queue/join`. */
async function uploadBufferToSpace(
  spaceUrl: string,
  buffer: Buffer,
  mime: string,
  filename: string,
  authHeaders: Record<string, string>,
): Promise<string> {
  const blob = new Blob([buffer as unknown as ArrayBuffer], { type: mime });
  const form = new FormData();
  form.append('files', blob, filename);
  const res = await fetch(`${spaceUrl}/upload`, {
    method: 'POST',
    headers: authHeaders, // do NOT set Content-Type; fetch sets the boundary
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Space upload failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const paths = (await res.json()) as string[];
  if (!Array.isArray(paths) || !paths[0]) throw new Error('Space upload returned no path');
  return paths[0];
}

/** Turn whatever we have (data URL / remote http URL / buffer) into a Buffer. */
async function sourceToBuffer(source: string | Buffer): Promise<{ buffer: Buffer; mime: string } | null> {
  try {
    if (Buffer.isBuffer(source)) return { buffer: source, mime: 'image/png' };
    if (source.startsWith('data:')) {
      const [meta, b64] = source.split(',');
      const mime = meta.slice(5).split(';')[0] || 'image/png';
      return { buffer: Buffer.from(b64, 'base64'), mime };
    }
    const res = await fetch(source);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return { buffer: Buffer.from(ab), mime: res.headers.get('content-type') || 'image/png' };
  } catch {
    return null;
  }
}

function base64ImagePayloadToArrayBuffer(raw: string): ArrayBuffer {
  const payload = raw.startsWith('data:') ? raw.slice(raw.indexOf(',') + 1) : raw;
  const buf = Buffer.from(payload, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// ─── handleTryOn ──────────────────────────────────────────────────────────────

interface HandleTryOnInput {
  userId: string;
  productId: string;
  userPhotoUrl?: string;
  productImageUrl?: string;
}

export interface HandleTryOnResult {
  resultUrl: string;
  storagePath: string;
  cached: boolean;
  fitLabel: string;
  recommendedSize: string;
  fitScore: number;
}

interface CachedTryOnRow {
  result_url: string;
  fit_label: string | null;
  recommended_size: string | null;
}

export async function handleTryOn(
  input: HandleTryOnInput,
  supabase: SupabaseClient<Database>
): Promise<HandleTryOnResult> {
  const { userId, productId, userPhotoUrl, productImageUrl } = input;
  const fashnKey = process.env.FASHN_API_KEY;
  const hfKey = process.env.HUGGINGFACE_API_KEY;

  // 1. Check cache
  const { data: cachedRecord } = await supabase
    .from('tryon_results')
    .select('result_url, fit_label, recommended_size')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single();

  const cached = cachedRecord as CachedTryOnRow | null;
  if (cached?.result_url) {
    let finalUrl = cached.result_url;
    // http(s):// URLs and data: URLs are usable as-is; anything else is a storage path.
    if (!finalUrl.startsWith('http') && !finalUrl.startsWith('data:')) {
      const { data: signedData } = await supabase.storage.from('avatars').createSignedUrl(finalUrl, 3600);
      if (signedData?.signedUrl) finalUrl = signedData.signedUrl;
    }
    const fitLabel = cached.fit_label ?? 'True to size';
    return {
      resultUrl: finalUrl,
      storagePath: cached.result_url,
      cached: true,
      fitLabel,
      recommendedSize: cached.recommended_size ?? 'M',
      fitScore: getFitScore(fitLabel),
    };
  }

  if (!userPhotoUrl || !productImageUrl) {
    throw new Error('Missing user photo or product image');
  }

  // 2. Run Try-On Engine (Fashn.ai with HuggingFace Fallback)
  let arrayBuffer: ArrayBuffer | null = null;
  let lastAiError: string | null = null;

  if (fashnKey) {
    try {
      console.log('[/api/tryon] Starting Fashn.ai Try-On Engine...');
      const predictionId = await startFashnTryOn(userPhotoUrl, productImageUrl, fashnKey);
      
      let fashnResultUrl: string | null = null;
      for (let i = 0; i < 45; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusUrl = await pollFashnResult(predictionId, fashnKey);
        if (statusUrl) {
          fashnResultUrl = statusUrl;
          break;
        }
      }

      if (!fashnResultUrl) {
        throw new Error('Fashn.ai Try-on timed out');
      }

      console.log('[/api/tryon] Fashn.ai completed successfully.');
      const imgRes = await fetch(fashnResultUrl);
      if (!imgRes.ok) throw new Error('Failed to download Fashn result image');
      arrayBuffer = await imgRes.arrayBuffer();

      if (!arrayBuffer) throw new Error('No image data from Fashn.ai');
    } catch(err) {
      console.warn('[/api/tryon] Fashn.ai failed, falling back to HuggingFace...', err);
      lastAiError = (err as Error).message;
    }
  }

  // 3. Fallback to HF Space AI engine
  if (!arrayBuffer && hfKey) {
    const SPACE_URL = (process.env.HF_SPACE_URL || 'https://yisol-idm-vton.hf.space').replace(/\/$/, '');
    const authHeaders = { Authorization: `Bearer ${hfKey}` };
    
    async function runIdmVtonOnce(attempt: number): Promise<ArrayBuffer> {
      console.log('[/api/tryon] HF Space call attempt %d → %s', attempt, SPACE_URL);

      const [userSrc, garmSrc] = await Promise.all([
        sourceToBuffer(userPhotoUrl as string),
        sourceToBuffer(productImageUrl as string),
      ]);
      if (!userSrc || !garmSrc) throw new Error('Failed to fetch/encode input images');

      const [humanPath, garmPath] = await Promise.all([
        uploadBufferToSpace(SPACE_URL, userSrc.buffer, userSrc.mime, `human_${Date.now()}.png`, authHeaders),
        uploadBufferToSpace(SPACE_URL, garmSrc.buffer, garmSrc.mime, `garment_${Date.now()}.png`, authHeaders),
      ]);

      const { data: clothingRows } = await supabase
        .from('clothing_assets')
        .select('category')
        .eq('product_id', productId)
        .limit(1);
      const clothingCategory =
        (clothingRows as Pick<ClothingAssetRow, 'category'>[] | null)?.[0]?.category ?? null;
      const idmGarmentType = idmVtonCategoryFromProductCategory(clothingCategory);

      const sessionHash = Math.random().toString(36).substring(2, 15);

      const joinResponse = await fetch(`${SPACE_URL}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          data: [
            { background: { path: humanPath, meta: { _type: 'gradio.FileData' } }, layers: [], composite: null },
            { path: garmPath, meta: { _type: 'gradio.FileData' } },
            idmGarmentType,
            true,
            true,
            30,
            42,
          ],
          fn_index: 0,
          session_hash: sessionHash,
        }),
      });

      if (!joinResponse.ok) {
        const body = await joinResponse.text().catch(() => '');
        throw new Error(`AI queue join failed (${joinResponse.status}): ${body.slice(0, 200)}`);
      }

      const dataRes = await fetch(`${SPACE_URL}/queue/data?session_hash=${sessionHash}`, { headers: authHeaders });
      if (!dataRes.ok) throw new Error(`SSE connect failed: ${dataRes.status}`);

      const reader = dataRes.body?.getReader();
      if (!reader) throw new Error('No SSE stream');

      const decoder = new TextDecoder();
      let resultData: unknown[] | null = null;
      let sseBuffer = '';
      const startTime = Date.now();

      type ProcessCompleted = {
        msg?: string;
        success?: boolean;
        output?: { data?: unknown[]; error?: string; [k: string]: unknown };
        [k: string]: unknown;
      };

      try {
        while (true) {
          if (Date.now() - startTime > 300_000) throw new Error('AI timeout after 5 minutes');
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            let parsed: ProcessCompleted;
            try {
              parsed = JSON.parse(trimmed.slice(6)) as ProcessCompleted;
            } catch {
              continue; // skip heartbeat / non-JSON lines
            }
            if (parsed.msg === 'process_completed') {
              if (parsed.success && parsed.output?.data) {
                resultData = parsed.output.data;
              } else {
                // Surface the full Space error so users can see "no GPU available",
                // "model loading", quota messages, stack traces, etc.
                const outputDump = parsed.output
                  ? JSON.stringify(parsed.output).slice(0, 400)
                  : 'no output field';
                const err = parsed.output?.error || outputDump;
                throw new Error(`Space returned error: ${err}`);
              }
            }
          }
          if (resultData) break;
        }
      } finally {
        reader.releaseLock();
      }

      if (!resultData) throw new Error('AI returned no result data');

      const first = resultData[0];
      let downloadUrl: string | null = null;
      let bytes: ArrayBuffer | null = null;

      if (typeof first === 'string') {
        if (first.startsWith('data:')) {
          bytes = base64ImagePayloadToArrayBuffer(first);
        } else if (first.startsWith('http')) {
          downloadUrl = first;
        } else {
          downloadUrl = `${SPACE_URL}/file=${first}`;
        }
      } else if (first && typeof first === 'object') {
        const obj = first as { url?: string; path?: string };
        if (obj.url) downloadUrl = obj.url;
        else if (obj.path) downloadUrl = `${SPACE_URL}/file=${obj.path}`;
      }

      if (!bytes && downloadUrl) {
        const imgRes = await fetch(downloadUrl, { headers: authHeaders });
        if (!imgRes.ok) throw new Error(`Failed to download AI result: ${imgRes.status}`);
        bytes = await imgRes.arrayBuffer();
      }

      if (!bytes) throw new Error('AI result could not be decoded');
      return bytes;
    }

    const MAX_ATTEMPTS = 2;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !arrayBuffer; attempt++) {
      try {
        arrayBuffer = await runIdmVtonOnce(attempt);
      } catch (err) {
        lastAiError = (err as Error).message;
        console.warn('[/api/tryon] Attempt %d failed: %s', attempt, lastAiError);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
    }
  }

  if (!arrayBuffer) {
    const detail = lastAiError ? ` (${lastAiError})` : '';
    throw new Error(
      `AI engine failed to produce a result${detail}. Please try again in a moment.`
    );
  }

  // 4. Upload result to R2 (or fallback to inline base64 so the image still renders)
  const filename = `tryons/tryon_${userId}_${productId}_${Date.now()}.png`;
  const r2Url = await uploadToR2(Buffer.from(arrayBuffer), filename, 'image/png');

  let resultUrl: string;
  if (r2Url) {
    resultUrl = r2Url;
    console.log('[/api/tryon] Result successfully stored in R2');
  } else {
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    resultUrl = `data:image/png;base64,${base64}`;
    console.warn('[/api/tryon] R2 unavailable — serving base64 result inline');
  }
  // `storagePath` is what we persist in tryon_results.result_url. With no R2,
  // we keep the full base64 data URL so it works as an <img src> on re-read.
  const storagePath = resultUrl;

  // 6. Fit metadata
  let fitLabel = 'True to size';
  let recommendedSize = 'M';

  // Ensure user exists (Fix for FK violation if testing with guest accounts)
  await (supabase.from('users') as any).upsert({ id: userId, email: `${userId}@vexa.guest` }).select();

  const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
  const { data: sizeChart } = await supabase.from('size_charts').select('*').eq('product_id', productId);

  if (user && sizeChart && Array.isArray(sizeChart) && sizeChart.length > 0) {
    const recommendation = getFitRecommendation(user, sizeChart);
    fitLabel = recommendation.fitLabel;
    recommendedSize = recommendation.recommendedSize;
  }

  // 7. Cache result
  console.log(`[/api/tryon] Caching result for user: ${userId}`);
  const { error: insertError } = await (supabase.from('tryon_results') as any).insert([
    {
      user_id: userId,
      product_id: productId,
      product_image_url: productImageUrl ?? '',
      result_url: storagePath,
      fit_label: fitLabel,
      recommended_size: recommendedSize,
    }
  ]);

  if (insertError) {
    console.warn('[/api/tryon] Failed to cache result:', insertError.message);
  }

  return {
    resultUrl,
    storagePath,
    cached: false,
    fitLabel,
    recommendedSize,
    fitScore: getFitScore(fitLabel),
  };
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Fail fast if the AI engine is not configured — better than silently returning
  // the user's own photo as the "result" (which looks completely broken to the user).
  if (!process.env.HUGGINGFACE_API_KEY && !process.env.FASHN_API_KEY) {
    return NextResponse.json(
      { error: 'HUGGINGFACE_API_KEY or FASHN_API_KEY is not configured. Add it to .env.local' },
      { status: 500 },
    );
  }

  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (await isRateLimited(ip, 10)) {
    return NextResponse.json({ error: 'Too many requests. Please wait 60 seconds.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { userId, userPhotoUrl, productImageUrl, productId } = body as {
      userId?: string;
      userPhotoUrl?: string;
      productImageUrl?: string;
      productId?: string;
    };

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Validate URLs — data: and blob: pass through, external URLs are origin-checked
    const validatedPhotoUrl = userPhotoUrl ? validateSecureUrl(userPhotoUrl, 'userPhotoUrl') : undefined;
    const validatedProductUrl = productImageUrl ? validateSecureUrl(productImageUrl, 'productImageUrl') : undefined;

    const authResult = await authenticateRequest(req, userId ?? '');
    if (authResult instanceof NextResponse) return authResult;

    const supabase = getServiceSupabase();
    const result = await handleTryOn(
      { userId: authResult.userId, productId, userPhotoUrl: validatedPhotoUrl, productImageUrl: validatedProductUrl },
      supabase
    );

    return NextResponse.json({
      resultUrl: result.resultUrl,
      cached: result.cached,
      fitLabel: result.fitLabel,
      recommendedSize: result.recommendedSize,
      fitScore: result.fitScore,
    }, { status: 200 });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[/api/tryon] Error:', err.message);
    const status = err.message.includes('not configured') ? 503 : (err.message.includes('timed out') ? 504 : 500);
    return NextResponse.json({ error: err.message }, { status });
  }
}