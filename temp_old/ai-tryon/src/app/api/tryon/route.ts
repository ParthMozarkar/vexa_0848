import { NextRequest, NextResponse } from 'next/server';
import { callFashnAI, pollFashnResult } from '@/lib/fashn';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, productId, userPhotoUrl, productImageUrl, category } = body;

    // 1. Validate the request body
    if (!userId || !productId || !userPhotoUrl || !productImageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Call callFashnAI
    const { jobId } = await callFashnAI(userPhotoUrl, productImageUrl, category as any || 'tops');

    // 3. Poll pollFashnResult every 2 seconds, up to 90 seconds (45 attempts)
    let finalStatus = 'processing';
    let finalResultUrl = undefined;
    let finalError = undefined;

    for (let attempts = 0; attempts < 45; attempts++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const res = await pollFashnResult(jobId);
      
      if (res.status === 'completed') {
        finalStatus = 'ready';
        finalResultUrl = res.resultUrl;
        break;
      } else if (res.status === 'failed') {
        finalStatus = 'error';
        finalError = res.error;
        break;
      }
    }

    if (finalStatus === 'error') {
      return NextResponse.json({ status: 'error', error: finalError || 'Try-on failed' }, { status: 500 });
    }

    if (finalStatus === 'processing') {
      // Timeout case
      return NextResponse.json({ status: 'processing', jobId });
    }

    // 4. On success, insert a row into Supabase tryon_results table
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Supabase environment variables are missing.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error: dbError } = await supabase
      .from('tryon_results')
      .insert({
        user_id: userId,
        product_id: productId,
        result_url: finalResultUrl,
        status: 'ready',
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Failed to insert tryon_result:', dbError);
    }

    // 5. Return { status: 'ready', resultUrl, productId }
    return NextResponse.json({
      status: 'ready',
      resultUrl: finalResultUrl,
      productId,
    });

  } catch (error: any) {
    // 6. On failure, return { status: 'error', error } with HTTP 500
    console.error('Try-on API Error:', error);
    return NextResponse.json({ status: 'error', error: error.message || 'Internal server error' }, { status: 500 });
  }
}
