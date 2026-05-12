/**
 * POST /api/tryon
 * Core try-on engine — BlackBox AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { validateApiKey } from '@/lib/apiKeyMiddleware';
import { getFitRecommendation, getFitScore } from '@/lib/fitEngine';
import type { MarketplaceContext } from '@/types';
import type { Database } from '@/types/database';
import { uploadToR2 } from '@/lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const FETCH_TIMEOUT_MS = 120_000;

export type TryOnCategory =
  | 'tops'
  | 'bottoms'
  | 'one-pieces'
  | 'shoes'
  | 'bags'
  | 'accessories'
  | 'jewelry';

const ALLOWED_STORAGE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin; } catch { return null; } })()
  : null;

function validateSecureUrl(url: string, description: string): string {
  if (!url) throw new Error(`${description} is required`);
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error(`${description} is not a valid URL`); }
  return url;
}

function getServiceSupabase(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase environment variables missing');
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

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

  if (!url.startsWith('data:') && !url.includes(',')) {
    try {
      const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(url, 3600);
      if (signed?.signedUrl) return signed.signedUrl;
    } catch (e) {
      console.warn(`Failed to sign path ${url}:`, e);
    }
    return url;
  }

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

async function persistResultImage(imageUrl: string, userId: string, productId: string, supabase: SupabaseClient<Database>): Promise<string> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return imageUrl;
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/png';
    const ext = contentType.split('/')[1]?.split(';')[0] || 'png';
    const filename = `tryon_results/${userId}_${productId}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filename, arrayBuffer, { contentType, upsert: true });
    if (!uploadError) {
      const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(filename, 86400 * 365);
      if (signed?.signedUrl) return signed.signedUrl;
    }
    return imageUrl;
  } catch {
    return imageUrl;
  }
}

async function callBlackBoxTryOn(personImageUrl: string, garmentImageUrl: string, category: TryOnCategory): Promise<string> {
  const apiKey = process.env.TNB_API_KEY;
  if (!apiKey) throw new Error('TNB_API_KEY not configured');

  const promptText = category === 'bottoms'
    ? 'Put this bottom/pants on the model'
    : category === 'one-pieces'
      ? 'Put this dress/outfit on the model'
      : 'Put this top/shirt on the model';

  const endpoint = category === 'shoes' ? 'vto-shoes' : 'vto_stream';

  const formData = new FormData();
  if (category === 'shoes') {
    formData.append('model_photo', personImageUrl);
    formData.append('shoes_photo', garmentImageUrl);
  } else {
    formData.append('model_photo', personImageUrl);
    formData.append('clothing_photo', garmentImageUrl);
    formData.append('prompt', promptText);
    formData.append('ratio', 'auto');
  }

  const res = await fetch(`https://thenewblack.ai/api/1.1/wf/${endpoint}?api_key=${apiKey}`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    throw new Error(`TNB Try-On failed (${res.status}): ${errText}`);
  }

  const responseText = (await res.text()).trim();
  
  // TNB sometimes returns a JSON string containing the URL
  if (responseText.startsWith('{')) {
    try {
      const json = JSON.parse(responseText);
      const url = json.response || json.url || json.output_url || json.image;
      if (url && typeof url === 'string' && url.startsWith('http')) return url;
    } catch { /* fall through */ }
  }

  if (responseText.startsWith('http')) return responseText;
  
  throw new Error(`TNB Try-On returned unexpected format: ${responseText.slice(0, 100)}`);
}

export async function handleTryOn(input: any, supabase: SupabaseClient<Database>) {
  const { userId, productId, userPhotoUrl, productImageUrl, category, garments } = input;

  try {
    const cachePromise = (supabase.from('tryon_results') as any)
      .select('result_url,fit_label,recommended_size')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single() as Promise<{ data: { result_url?: string; fit_label?: string; recommended_size?: string } | null }>;
    const timeoutPromise = new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 2000));
    const { data: cached } = await Promise.race([cachePromise, timeoutPromise]);
    if (cached?.result_url) {
      return { resultUrl: cached.result_url, cached: true, fitLabel: cached.fit_label || 'True to size', recommendedSize: cached.recommended_size || 'M', fitScore: getFitScore(cached.fit_label || '') };
    }
  } catch { }

  const itemsToProcess = garments || (productImageUrl ? [{ url: productImageUrl, category: category ?? 'tops' }] : []);
  let resUrl = '';

  // PERF: Resolve all initial assets in parallel to shave off 2-4 seconds
  if (itemsToProcess.length === 1) {
    const [personUrlFinal, garmentUrlFinal] = await Promise.all([
      resolveToPublicUrl(userPhotoUrl, 'person', userId, supabase),
      resolveToPublicUrl(itemsToProcess[0].url, 'garment', userId, supabase)
    ]);
    resUrl = await callBlackBoxTryOn(personUrlFinal, garmentUrlFinal, itemsToProcess[0].category as TryOnCategory);
  } else {
    // For sequential multi-item, we still resolve person first
    resUrl = await resolveToPublicUrl(userPhotoUrl, 'person', userId, supabase);
    for (const item of itemsToProcess) {
      const gUrl = await resolveToPublicUrl(item.url, 'garment', userId, supabase);
      resUrl = await callBlackBoxTryOn(resUrl, gUrl, item.category as TryOnCategory);
    }
  }

  const rec = { fitLabel: 'True to size', recommendedSize: 'M' };
  Promise.resolve().then(async () => {
    try {
      const persistedUrl = await persistResultImage(resUrl, userId, productId, supabase);
      const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
      const { data: chart } = await supabase.from('size_charts').select('*').eq('product_id', productId);
      const finalRec = (user && chart?.length) ? getFitRecommendation(user, chart) : rec;
      await (supabase.from('tryon_results') as any).upsert({
        user_id: userId, product_id: productId, result_url: persistedUrl,
        fit_label: finalRec.fitLabel, recommended_size: finalRec.recommendedSize, status: 'ready',
      });
    } catch { }
  });

  return { resultUrl: resUrl, cached: false, ...rec, fitScore: getFitScore(rec.fitLabel) };
}

async function logUsage(supabase: SupabaseClient<Database>, data: any) {
  try {
    await (supabase.from('usage_logs') as any).insert({
      user_id: data.userId, provider: 'blackbox', status: data.status, error_message: data.errorMessage,
      latency_ms: data.latencyMs, ip_address: data.ipAddress,
      device_info: data.deviceInfo, user_email: data.userEmail,
    });
  } catch { }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  if (req.headers.get('x-debug-ping') === 'true') return NextResponse.json({ status: 'alive', time: new Date().toISOString() });

  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const ua = req.headers.get('user-agent') || '';
  let deviceInfo = 'Windows';
  if (ua.includes('Macintosh')) deviceInfo = 'Mac';
  else if (ua.includes('iPhone') || ua.includes('iPad')) deviceInfo = 'iOS';
  else if (ua.includes('Android')) deviceInfo = 'Android';

  const supabase = getServiceSupabase();
  try {
    const { userId, userPhotoUrl, productImageUrl, productId, category, garments } = await req.json();
    const auth = await authenticateRequest(req, userId);
    if (auth instanceof NextResponse) return auth;

    const result = await handleTryOn({ userId: auth.userId, productId, userPhotoUrl, productImageUrl, category, garments }, supabase);

    let email: string | undefined;
    if (auth.userId !== 'anonymous') {
      supabase.auth.admin.getUserById(auth.userId).then(r => { email = r.data?.user?.email; }).catch(() => {});
    }

    await logUsage(supabase, { userId: auth.userId, status: 'success', latencyMs: Date.now() - startTime, ipAddress: ip, deviceInfo, userEmail: email });
    const finalResultUrl = result.resultUrl.startsWith('http') && !result.resultUrl.includes('supabase.co')
      ? `/api/proxy?url=${encodeURIComponent(result.resultUrl)}`
      : result.resultUrl;

    return NextResponse.json({ ...result, resultUrl: finalResultUrl, status: 'ready' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await logUsage(supabase, { userId: 'anonymous', status: 'error', errorMessage: message, latencyMs: Date.now() - startTime, ipAddress: ip, deviceInfo });
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
