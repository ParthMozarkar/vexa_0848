import { NextRequest, NextResponse } from 'next/server';
import { callFashnAI, pollFashnResult } from '@/lib/fashn';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userPhotoUrl, products } = body as {
      userId: string;
      userPhotoUrl: string;
      products: { id: string, imageUrl: string, category?: string }[];
    };

    if (!userId || !userPhotoUrl || !products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (products.length > 10) {
      return NextResponse.json({ error: 'Max 10 products per batch allowed' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const supabase = (serviceRoleKey && supabaseUrl) 
          ? createClient(supabaseUrl, serviceRoleKey) 
          : null;

        for (const product of products) {
          try {
            // Initiate try-on
            const { jobId } = await callFashnAI(
              userPhotoUrl,
              product.imageUrl,
              (product.category as any) || 'tops'
            );

            // Poll for result
            let resultUrl: string | undefined;
            let error: string | undefined;

            for (let attempts = 0; attempts < 45; attempts++) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              const res = await pollFashnResult(jobId);
              
              if (res.status === 'completed') {
                resultUrl = res.resultUrl;
                break;
              } else if (res.status === 'failed') {
                error = res.error;
                break;
              }
            }

            if (resultUrl) {
              if (supabase) {
                await supabase
                  .from('tryon_results')
                  .insert({
                    user_id: userId,
                    product_id: product.id,
                    result_url: resultUrl,
                    status: 'ready',
                    created_at: new Date().toISOString(),
                  });
              }
              send({ productId: product.id, status: 'ready', resultUrl });
            } else {
              send({ productId: product.id, status: 'error', error: error || 'Timed out' });
            }
          } catch (err: any) {
            send({ productId: product.id, status: 'error', error: err.message });
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
