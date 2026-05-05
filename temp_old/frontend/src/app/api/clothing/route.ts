import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ProductCategory } from '@/types';
import { fal } from '@fal-ai/client';

export const maxDuration = 300;

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase URL or key not configured');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

interface ClothingRequestBody {
  productId: string;
  productImageUrl: string;
  category: ProductCategory;
}

const ALLOWED_CATEGORIES: readonly ProductCategory[] = [
  'clothing',
  'shoes',
  'hats',
  'jewelry',
  'bags',
  'tops',
  'bottoms',
  'dresses',
  'outerwear',
  'accessories',
];

function isProductCategory(value: string): value is ProductCategory {
  return (ALLOWED_CATEGORIES as readonly string[]).includes(value);
}

interface ClothingApiSuccess {
  glbUrl: string;
  cached: boolean;
}

interface ClothingApiError {
  error: string;
}

function parseRequestBody(raw: unknown): ClothingRequestBody | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const productId = o.productId;
  const productImageUrl = o.productImageUrl;
  const category = o.category;
  if (typeof productId !== 'string' || productId.length === 0) return null;
  if (typeof productImageUrl !== 'string' || productImageUrl.length === 0)
    return null;
  if (typeof category !== 'string' || !isProductCategory(category)) return null;
  return { productId, productImageUrl, category };
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ClothingApiSuccess | ClothingApiError>> {
  try {
    let parsed: unknown;
    try {
      parsed = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const body = parseRequestBody(parsed);
    if (!body) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    const { productId, productImageUrl, category } = body;
    const supabase = getSupabase();

    const { data: cached } = await supabase
      .from('clothing_assets')
      .select('glb_url')
      .eq('product_id', productId)
      .maybeSingle();

    if (cached?.glb_url) {
      return NextResponse.json({ glbUrl: cached.glb_url, cached: true });
    }

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json(
        { error: 'FAL_KEY not configured' },
        { status: 500 }
      );
    }

    fal.config({ credentials: falKey });

    const result = await fal.subscribe('fal-ai/hyper3d/rodin', {
      input: {
        input_image_urls: [productImageUrl],
        geometry_file_format: 'glb',
        material: 'PBR',
        quality: 'medium',
      }
    });

    if (!result.data?.model_mesh?.url) {
      throw new Error('Fal task creation returned unexpected payload');
    }
    
    const glbUrl = result.data.model_mesh.url;

    const { error: upsertError } = await supabase.from('clothing_assets').upsert(
      {
        product_id: productId,
        product_image_url: productImageUrl,
        category,
        glb_url: glbUrl,
        status: 'completed',
        meshy_task_id: null,
      } as any,
      { onConflict: 'product_id' }
    );

    if (upsertError) {
      console.error('[/api/clothing] Supabase upsert:', upsertError.message);
    }

    return NextResponse.json({ glbUrl, cached: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/clothing]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
