/**
 * POST /api/tryon
 * Core try-on engine — supports The New Black AI, Fashn.ai, and LightX.
 * Default provider: newblack (toggled via TRYON_PROVIDER env).
 * Deployment Heartbeat: 2026-05-09
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isRateLimited } from '@/lib/rateLimit';
import { validateApiKey } from '@/lib/apiKeyMiddleware';
import { getFitRecommendation, getFitScore } from '@/lib/fitEngine';
import type { MarketplaceContext, FashnRunResponse, FashnStatusResponse } from '@/types';
import type { ClothingAssetRow, Database } from '@/types/database';
import { uploadToR2 } from '@/lib/r2';

// ─── Next.js route config ─────────────────────────────────────────────────────
export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// ─── Provider toggle ────────────────────────────────────────────────────────
type TryOnProvider = 'fashn' | 'lightx' | 'newblack';
function getProvider(): TryOnProvider {
  const explicit = process.env.TRYON_PROVIDER?.toLowerCase();
  if (explicit === 'fashn' || explicit === 'lightx' || explicit === 'newblack') return explicit;
  // Default priority: newblack > fashn > lightx
  if (process.env.NEWBLACK_API_KEY) return 'newblack';
  if (process.env.FASHN_API_KEY) return 'fashn';
  return 'lightx';
}

// ─── The New Black API constants ────────────────────────────────────────────
const NEWBLACK_BASE_URL = 'https://thenewblack.ai/api/1.1/wf';
const NEWBLACK_FETCH_TIMEOUT_MS = 120_000; // Synchronous — can take a while

// The New Black uses a single vto_stream endpoint for all clothing try-ons
const NEWBLACK_VTO_URL = `${NEWBLACK_BASE_URL}/vto_stream`;

// ─── Fashn API constants ────────────────────────────────────────────────────────
const FASHN_TRYON_URL = 'https://api.fashn.ai/v1/run';
const FASHN_STATUS_URL = 'https://api.fashn.ai/v1/status';
const FASHN_POLL_INTERVAL_MS = 3000;
const FASHN_MAX_POLLS = 20;
const FASHN_FETCH_TIMEOUT_MS = 30_000;

// ─── LightX API constants ───────────────────────────────────────────────────────
const LIGHTX_TRYON_URL = 'https://api.lightxeditor.com/external/api/v2/aivirtualtryon';
const LIGHTX_STATUS_URL = 'https://api.lightxeditor.com/external/api/v2/order-status';
const LIGHTX_POLL_INTERVAL_MS = 3000;
const LIGHTX_MAX_POLLS = 30;
const LIGHTX_FETCH_TIMEOUT_MS = 15_000;

const LIGHTX_KEYS = [
  process.env.LIGHTX_API_KEY,
  process.env.LIGHTX_API_KEY_2,
  process.env.LIGHTX_API_KEY_3,
  process.env.LIGHTX_API_KEY_4,
  process.env.LIGHTX_API_KEY_5,
  process.env.LIGHTX_API_KEY_6,
].filter(Boolean) as string[];

let currentKeyIndex = 0;
function getLightxKey() {
  if (LIGHTX_KEYS.length === 0) return null;
  const key = LIGHTX_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % LIGHTX_KEYS.length;
  return key;
}

// ─── SSRF Protection ──────────────────────────────────────────────────────────

const ALLOWED_STORAGE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin; } catch { return null; } })()
  : null;

function validateSecureUrl(url: string, description: string): string {
  if (!url) throw new Error(`${description} is required`);
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error(`${description} is not a valid URL`); }
  if (!ALLOWED_STORAGE_ORIGIN) return url;
  const allowedOrigins = [
    ALLOWED_STORAGE_ORIGIN,
    'https://images.unsplash.com',
    'https://cdn.shopify.com',
    'https://api.lightxeditor.com',
    'https://thenewblack.ai',
  ];
  const isAllowed = allowedOrigins.some((o) => parsed.origin === o)
    || parsed.origin.endsWith('.supabase.co')
    || parsed.origin.endsWith('.r2.dev')
    || parsed.origin.endsWith('.lightxeditor.com')
    || parsed.origin.endsWith('.cdn.bubble.io');
  if (!isAllowed) throw new Error(`${description} origin not allowed: ${parsed.origin}`);
  return url;
}

// ─── Supabase helper ──────────────────────────────────────────────────────────

function getServiceSupabase(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables missing');
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

async function ensureBucketExists(supabase: SupabaseClient<Database>, bucketName: string) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some(b => b.name === bucketName)) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }
  } catch (err) { console.error(`[Supabase] Bucket error:`, err); }
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

interface AuthResult { userId: string; marketplace: MarketplaceContext | null; }

async function authenticateRequest(req: NextRequest, bodyUserId: string): Promise<AuthResult | NextResponse> {
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
  await (supabase.from('users') as any).upsert({ id: guestId, email: `${guestId}@vexa.guest` });
  return { userId: guestId, marketplace: null };
}

async function resolveToPublicUrl(url: string, label: string, userId: string, supabase: SupabaseClient<Database>): Promise<string> {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  
  // Handle Supabase relative paths (e.g., 'uploads/xyz.png')
  if (!url.startsWith('data:') && !url.includes(',')) {
    try {
      // If it looks like a Supabase path, we'll try to sign it.
      // Most files in this repo are in the 'avatars' bucket.
      const bucket = 'avatars';
      const path = url;
      
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (signed?.signedUrl) return signed.signedUrl;
    } catch (e) {
      console.warn(`[resolveToPublicUrl] Failed to sign path ${url}:`, e);
    }
    return url;
  }

  // Handle Data URLs
  const [meta, b64] = url.split(',');
  if (!b64) return url;

  const mime = meta?.slice(5).split(';')[0] || 'image/png';
  const ext = mime.split('/')[1] || 'png';
  const buffer = Buffer.from(b64, 'base64');
  const filename = `uploads/${userId}_${label}_${Date.now()}.${ext}`;
  
  const r2Url = await uploadToR2(buffer, filename, mime);
  if (r2Url) return r2Url;
  
  await supabase.storage.from('avatars').upload(filename, buffer, { contentType: mime, upsert: true });
  const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(filename, 3600);
  return signed?.signedUrl || url;
}

// ─── Persist generated image to R2/Supabase ──────────────────────────────────
// The New Black deletes images after 48h, so we must persist immediately.

async function persistResultImage(
  imageUrl: string,
  userId: string,
  productId: string,
  supabase: SupabaseClient<Database>,
): Promise<string> {
  try {
    console.log('[Persist] Downloading result image to save permanently...');
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      console.warn(`[Persist] Failed to download (${res.status}), using original URL`);
      return imageUrl;
    }
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/png';

    // Validate that we actually got an image, not an HTML error page
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      console.warn('[Persist] Downloaded content is not an image, using original URL');
      return imageUrl;
    }

    const ext = contentType.split('/')[1]?.split(';')[0] || 'png';
    const filename = `tryon_results/${userId}_${productId}_${Date.now()}.${ext}`;

    // Prefer Supabase Storage — generates proper signed URLs that browsers can load
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filename, arrayBuffer, { contentType, upsert: true });
    
    if (uploadError) {
      console.warn('[Persist] Supabase upload failed:', uploadError);
    } else {
      const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(filename, 86400 * 365);
      if (signed?.signedUrl) {
        console.log('[Persist] Saved to Supabase Storage');
        return signed.signedUrl;
      }
    }

    // Fallback: return original New Black URL (valid for 48h)
    console.warn('[Persist] All storage failed, using original URL (expires in 48h)');
    return imageUrl;
  } catch (err) {
    console.warn('[Persist] Failed to persist image, using original URL:', err);
    return imageUrl;
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

// ─── The New Black ────────────────────────────────────────────────────────────
async function callNewBlackTryon(
  personImageUrl: string,
  garmentImageUrl: string,
  category: string = 'tops',
): Promise<string> {
  const apiKey = process.env.NEWBLACK_API_KEY;
  if (!apiKey) throw new Error('No New Black API key configured');

  const url = `${NEWBLACK_VTO_URL}?api_key=${apiKey}`;

  // Build a prompt hint from the category
  const promptText = category === 'bottoms'
    ? 'Put this bottom/pants on the model'
    : category === 'one-pieces'
      ? 'Put this dress/outfit on the model'
      : 'Put this top/shirt on the model';

  console.log(`[NewBlack] Calling vto_stream (category: ${category})...`);

  // The New Black uses multipart/form-data with clothing_photo, prompt, and ratio
  const formData = new FormData();
  formData.append('model_photo', personImageUrl);
  formData.append('clothing_photo', garmentImageUrl);
  formData.append('prompt', promptText);
  formData.append('ratio', 'auto');

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(NEWBLACK_FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    console.error(`[NewBlack] Request failed (${res.status}):`, errText);
    throw new Error(`New Black API failed (${res.status}): ${errText}`);
  }

  // Response format: { "status": "success", "response": "https://...image.png" }
  const responseText = await res.text();

  try {
    const json = JSON.parse(responseText);

    // Check for error status
    if (json.status && json.status !== 'success') {
      throw new Error(`New Black API error: ${json.status} — ${json.message || json.error || 'unknown'}`);
    }

    // Primary field is "response"
    const imageUrl = json.response || json.image || json.url || json.output || json.result;
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      console.log('[NewBlack] Got result URL:', imageUrl.substring(0, 80) + '...');
      return imageUrl;
    }

    // If no image URL found in the parsed JSON
    console.error('[NewBlack] JSON parsed but no image URL found:', JSON.stringify(json).substring(0, 500));
    throw new Error('New Black API returned success but no image URL');
  } catch (parseErr: any) {
    // If it was our own thrown error, rethrow it
    if (parseErr.message.includes('New Black API')) throw parseErr;

    // Not JSON — try as direct URL string
    const trimmed = responseText.trim();
    if (trimmed.startsWith('http')) {
      console.log('[NewBlack] Got direct URL response');
      return trimmed;
    }

    console.error('[NewBlack] Unexpected response:', responseText.substring(0, 500));
    throw new Error('New Black API returned an unexpected response format');
  }
}

// ─── Fashn ────────────────────────────────────────────────────────────────────
async function callFashnTryon(personImageUrl: string, garmentImageUrl: string, category: string = 'tops'): Promise<string> {
  const apiKey = process.env.FASHN_API_KEY;
  const res = await fetch(FASHN_TRYON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model_image: personImageUrl, garment_image: garmentImageUrl, category }),
    signal: AbortSignal.timeout(FASHN_FETCH_TIMEOUT_MS),
  });
  const data = await res.json() as FashnRunResponse;
  const orderId = data.id;
  for (let poll = 1; poll <= FASHN_MAX_POLLS; poll++) {
    await new Promise(r => setTimeout(r, FASHN_POLL_INTERVAL_MS));
    const statusRes = await fetch(`${FASHN_STATUS_URL}/${orderId}`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
    const statusData = await statusRes.json() as FashnStatusResponse;
    if (statusData.status === 'completed') return statusData.output![0];
    if (statusData.status === 'failed') throw new Error('Fashn job failed');
  }
  throw new Error('Fashn timeout');
}

// ─── LightX ──────────────────────────────────────────────────────────────────
async function callLightxTryon(personImageUrl: string, garmentImageUrl: string): Promise<string> {
  const maxRetries = Math.max(1, LIGHTX_KEYS.length);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getLightxKey();
    if (!apiKey) throw new Error('No LightX API key configured');

    try {
      console.log(`[LightX] Attempt ${attempt + 1}/${maxRetries} with key index...`);
      const res = await fetch(LIGHTX_TRYON_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ imageUrl: personImageUrl, styleImageUrl: garmentImageUrl }),
        signal: AbortSignal.timeout(LIGHTX_FETCH_TIMEOUT_MS),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown');
        throw new Error(`LightX init failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const orderId = data.body?.orderId || data.orderId || data.body?.taskId || data.taskId;

      if (!orderId) {
        const msg = data.body?.message || data.message || 'LightX did not return an order ID';
        if (msg.includes('CREDITS_CONSUMED') || msg.includes('limit reached')) {
          console.warn(`[LightX] Key exhausted, trying next key...`);
          lastError = new Error(msg);
          continue;
        }
        console.error('[LightX] No orderId/taskId in response:', JSON.stringify(data));
        throw new Error(msg);
      }

      console.log(`[LightX] Order ${orderId} — polling started`);
      for (let poll = 1; poll <= LIGHTX_MAX_POLLS; poll++) {
        await new Promise(r => setTimeout(r, LIGHTX_POLL_INTERVAL_MS));
        try {
          const sRes = await fetch(LIGHTX_STATUS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
            body: JSON.stringify({ orderId }),
            signal: AbortSignal.timeout(LIGHTX_FETCH_TIMEOUT_MS),
          });
          const sData = await sRes.json();
          const s = sData.body?.status || sData.status || sData.body?.state || sData.state;
          const output = sData.body?.output || sData.output || sData.body?.result?.imageUrl || sData.result?.imageUrl;
          console.log(`[LightX] Poll ${poll}/${LIGHTX_MAX_POLLS} — status: ${s}`);

          if (s === 'active' || s === 'completed' || s === 'success') {
            if (!output) {
              console.warn(`[LightX] Status is ${s} but output URL is missing:`, JSON.stringify(sData));
              continue;
            }
            return output;
          }
          if (s === 'failed' || s === 'error') {
            const errMsg = sData.body?.message || sData.message || sData.body?.error || sData.error || 'unknown error';
            throw new Error(`LightX job failed: ${errMsg}`);
          }
        } catch (pollErr: any) {
          if (pollErr.name === 'TimeoutError' || pollErr.name === 'AbortError') {
            console.warn(`[LightX] Poll ${poll} timed out, retrying...`);
            continue;
          }
          throw pollErr;
        }
      }
      throw new Error('LightX timeout');
    } catch (err: any) {
      lastError = err;
      if (err.message.includes('CREDITS_CONSUMED') || err.message.includes('limit reached')) {
        console.warn(`[LightX] Attempt ${attempt + 1} failed due to credits. Rotating key...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('LightX failed after rotating all keys');
}

// ─── handleTryOn ──────────────────────────────────────────────────────────────

export async function handleTryOn(input: any, supabase: SupabaseClient<Database>) {
  const { userId, productId, userPhotoUrl, productImageUrl, category } = input;
  const { data: cached } = await supabase.from('tryon_results').select('*').eq('user_id', userId).eq('product_id', productId).single();
  if (cached?.result_url) return { resultUrl: cached.result_url, cached: true, fitLabel: cached.fit_label || 'True to size', recommendedSize: cached.recommended_size || 'M', fitScore: getFitScore(cached.fit_label || '') };

  const [pUrl, gUrl] = await Promise.all([resolveToPublicUrl(userPhotoUrl, 'person', userId, supabase), resolveToPublicUrl(productImageUrl, 'garment', userId, supabase)]);
  const provider = getProvider();

  let resUrl: string;
  switch (provider) {
    case 'newblack':
      resUrl = await callNewBlackTryon(pUrl, gUrl, category || 'tops');
      // CRITICAL: New Black deletes images after 48h — persist immediately
      resUrl = await persistResultImage(resUrl, userId, productId, supabase);
      break;
    case 'fashn':
      resUrl = await callFashnTryon(pUrl, gUrl, category || 'tops');
      break;
    case 'lightx':
    default:
      resUrl = await callLightxTryon(pUrl, gUrl);
      break;
  }

  const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
  const { data: chart } = await supabase.from('size_charts').select('*').eq('product_id', productId);
  const rec = (user && chart?.length) ? getFitRecommendation(user, chart) : { fitLabel: 'True to size', recommendedSize: 'M' };

  await (supabase.from('tryon_results') as any).upsert({ user_id: userId, product_id: productId, result_url: resUrl, fit_label: rec.fitLabel, recommended_size: rec.recommendedSize, status: 'ready' });
  return { resultUrl: resUrl, cached: false, ...rec, fitScore: getFitScore(rec.fitLabel) };
}

// ─── Logging helper ─────────────────────────────────────────────────────────

async function logUsage(supabase: SupabaseClient<Database>, data: any) {
  try {
    await (supabase.from('usage_logs') as any).insert({
      user_id: data.userId, provider: data.provider, status: data.status, error_message: data.errorMessage,
      latency_ms: data.latencyMs, api_key_index: data.apiKeyIndex, ip_address: data.ipAddress,
      device_info: data.deviceInfo, user_email: data.userEmail
    });
  } catch (e) { console.error('Logging failed', e); }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  // DEBUG PING: See if the server is even reachable
  if (req.headers.get('x-debug-ping') === 'true') {
    return NextResponse.json({ status: 'alive', time: new Date().toISOString() });
  }
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const ua = req.headers.get('user-agent') || '';
  let deviceInfo = "Windows";
  if (ua.includes("Macintosh")) deviceInfo = "Mac";
  else if (ua.includes("iPhone") || ua.includes("iPad")) deviceInfo = "iOS";
  else if (ua.includes("Android")) deviceInfo = "Android";

  const supabase = getServiceSupabase();
  try {
    const { userId, userPhotoUrl, productImageUrl, productId, category } = await req.json();
    const auth = await authenticateRequest(req, userId);
    if (auth instanceof NextResponse) return auth;

    const result = await handleTryOn({ userId: auth.userId, productId, userPhotoUrl, productImageUrl, category }, supabase);
    
    let email;
    if (auth.userId !== 'anonymous') {
      supabase.auth.admin.getUserById(auth.userId).then(r => email = r.data?.user?.email).catch(() => {});
    }

    await logUsage(supabase, { userId: auth.userId, provider: getProvider(), status: 'success', latencyMs: Date.now() - startTime, ipAddress: ip, deviceInfo, userEmail: email });
    return NextResponse.json({ ...result, status: 'ready' });
  } catch (err: any) {
    await logUsage(supabase, { userId: 'anonymous', provider: getProvider(), status: 'error', errorMessage: err.message, latencyMs: Date.now() - startTime, ipAddress: ip, deviceInfo });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
