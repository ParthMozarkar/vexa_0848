import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isRateLimited } from '@/lib/rateLimit';
import { startFashnTryOn, pollFashnResult } from '@/lib/fashn';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  if (await isRateLimited(ip, 10)) {
    return NextResponse.json({ error: 'Too many requests. Please wait 60 seconds.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { userId, userPhotoUrl, products } = body;

    if (!userId || !userPhotoUrl || !products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl!, supabaseKey!, { auth: { persistSession: false } });

    const results = [];
    let targetPhotoUrl = userPhotoUrl;

    // Handle base64 data URL at the start of the batch
    if (userPhotoUrl.startsWith('data:')) {
      try {
        const base64Data = userPhotoUrl.split(',')[1];
        if (base64Data) {
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `batch_base64_${userId}_${Date.now()}.png`;
          const storagePath = `uploads/${fileName}`;

          await supabase.storage
            .from('avatars')
            .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });

          const { data: signedData } = await supabase.storage
            .from('avatars')
            .createSignedUrl(storagePath, 3600);
          
          if (signedData?.signedUrl) targetPhotoUrl = signedData.signedUrl;
        }
      } catch (e) {
        console.error('[/api/tryon/batch] Data URL conversion failed:', e);
      }
    }

    for (const product of products) {
      const { productId, productImageUrl } = product;

      // 1. Check cache
      const { data: cached } = await supabase
        .from('tryon_results')
        .select('result_url')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (cached?.result_url) {
        // Sign the cached path
        const { data: signedData } = await supabase.storage
          .from('avatars')
          .createSignedUrl(cached.result_url, 3600);
        
        if (signedData?.signedUrl) {
          results.push({ productId, resultUrl: signedData.signedUrl, cached: true });
          continue;
        }
      }

      try {
        const fashnKey = process.env.FASHN_API_KEY;

        if (!fashnKey) {
          return NextResponse.json({ error: 'No try-on API key configured' }, { status: 503 });
        }

        let arrayBuffer: ArrayBuffer | null = null;
        
        console.log(`[/api/tryon/batch] Starting Fashn.ai for product ${productId}...`);
        const predictionId = await startFashnTryOn(targetPhotoUrl, productImageUrl, fashnKey);
        let fashnResultUrl: string | null = null;
        
        for (let i = 0; i < 45; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const statusUrl = await pollFashnResult(predictionId, fashnKey);
          if (statusUrl) {
            fashnResultUrl = statusUrl;
            break;
          }
        }

        if (fashnResultUrl) {
          const imgRes = await fetch(fashnResultUrl);
          if (!imgRes.ok) throw new Error('Failed to download Fashn result image');
          arrayBuffer = await imgRes.arrayBuffer();
          console.log(`[/api/tryon/batch] Fashn.ai completed for product ${productId}.`);
        } else {
          throw new Error('Fashn.ai polling timed out');
        }

        if (!arrayBuffer) {
          throw new Error('Try-on method failed');
        }
        
        const fileName = `tryon_${userId}_${productId}_${Date.now()}.png`;
        const storagePath = `tryons/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(storagePath, arrayBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) throw new Error(`Storage error: ${uploadError.message}`);

        // Sign the new result
        const { data: signedData } = await supabase.storage
          .from('avatars')
          .createSignedUrl(storagePath, 3600);

        const resultUrl = signedData?.signedUrl ?? '';

        await supabase.from('tryon_results').insert({
          user_id: userId,
          product_id: productId,
          product_image_url: productImageUrl,
          result_url: storagePath, // Store path, not URL
          fit_label: 'True to size',
          recommended_size: 'M'
        });

        results.push({ productId, resultUrl, cached: false });
      } catch (e: unknown) {
        const err = e as Error;
        console.error(`Batch tryon failed for ${productId}:`, err);
        results.push({ productId, error: err.message });
      }
    }

    return NextResponse.json({ results }, { status: 200 });

  } catch (error: unknown) {
    const err = error as Error;
    console.error("[/api/tryon/batch] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
