/**
 * POST /api/tryon
 * Core try-on engine — supports Fashn.ai and LightX (toggled via TRYON_PROVIDER env).
 * Deployment Heartbeat: 2026-05-04
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
type TryOnProvider = 'fashn' | 'lightx';
function getProvider(): TryOnProvider {
  const explicit = process.env.TRYON_PROVIDER?.toLowerCase();
  if (explicit === 'fashn' || explicit === 'lightx') return explicit;
  return process.env.FASHN_API_KEY ? 'fashn' : 'lightx';
}

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
const LIGHTX_MAX_POLLS = 40;
const LIGHTX_FETCH_TIMEOUT_MS = 30_000;

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
  const allowedOrigins = [ALLOWED_STORAGE_ORIGIN, 'https://images.unsplash.com', 'https://cdn.shopify.com', 'https://api.lightxeditor.com'];
  const isAllowed = allowedOrigins.some((o) => parsed.origin === o) || parsed.origin.endsWith('.supabase.co') || parsed.origin.endsWith('.r2.dev') || parsed.origin.endsWith('.lightxeditor.com');
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
  if (url.startsWith('http')) return url;
  const [meta, b64] = url.split(',');
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

// ─── API calls ────────────────────────────────────────────────────────────────

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

async function callLightxTryon(personImageUrl: string, garmentImageUrl: string): Promise<string> {
  const apiKey = getLightxKey();
  const res = await fetch(LIGHTX_TRYON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey! },
    body: JSON.stringify({ imageUrl: personImageUrl, styleImageUrl: garmentImageUrl }),
  });
  const data = await res.json();
  const orderId = data.body?.orderId || data.orderId;
  for (let poll = 1; poll <= LIGHTX_MAX_POLLS; poll++) {
    await new Promise(r => setTimeout(r, LIGHTX_POLL_INTERVAL_MS));
    const sRes = await fetch(LIGHTX_STATUS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey! }, body: JSON.stringify({ orderId }) });
    const sData = await sRes.json();
    const s = sData.body?.status || sData.status;
    if (s === 'active' || s === 'completed') return sData.body?.output || sData.output;
    if (s === 'failed') throw new Error('LightX job failed');
  }
  throw new Error('LightX timeout');
}

// ─── handleTryOn ──────────────────────────────────────────────────────────────

export async function handleTryOn(input: any, supabase: SupabaseClient<Database>) {
  const { userId, productId, userPhotoUrl, productImageUrl } = input;
  const { data: cached } = await supabase.from('tryon_results').select('*').eq('user_id', userId).eq('product_id', productId).single();
  if (cached?.result_url) return { resultUrl: cached.result_url, cached: true, fitLabel: cached.fit_label || 'True to size', recommendedSize: cached.recommended_size || 'M', fitScore: getFitScore(cached.fit_label || '') };

  const [pUrl, gUrl] = await Promise.all([resolveToPublicUrl(userPhotoUrl, 'person', userId, supabase), resolveToPublicUrl(productImageUrl, 'garment', userId, supabase)]);
  const provider = getProvider();
  const resUrl = provider === 'lightx' ? await callLightxTryon(pUrl, gUrl) : await callFashnTryon(pUrl, gUrl);

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
    const { userId, userPhotoUrl, productImageUrl, productId } = await req.json();
    const auth = await authenticateRequest(req, userId);
    if (auth instanceof NextResponse) return auth;

    const result = await handleTryOn({ userId: auth.userId, productId, userPhotoUrl, productImageUrl }, supabase);
    
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
