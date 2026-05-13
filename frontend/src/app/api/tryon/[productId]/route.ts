/**
 * POST /api/tryon/[productId]
 * Authenticated 2D try-on for a product — uses the same TNB pipeline as POST /api/tryon.
 *
 * Auth: Bearer Supabase access token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleTryOn } from '@/app/api/tryon/route';
import { getFitScore } from '@/lib/fitEngine';
import type { TryOnResult, TryOnCategory } from '@/types';
import { getPublicSupabaseUrl, getPublicSupabaseAnonKey } from '@/lib/env';
import type { HandleTryOnResult } from '@/lib/tryonContracts';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

interface RouteContext {
  params: Promise<{ productId: string }>;
}

interface ProductTryOnBody {
  userId?: string;
  userPhotoUrl?: string;
  productImageUrl?: string;
  category?: TryOnCategory;
  garments?: { url: string; category: TryOnCategory }[];
  avatarGlbUrl?: string;
  clothingGlbUrl?: string;
}
}

export async function POST(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { productId } = await params;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Bearer token required' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const supabaseUrl = getPublicSupabaseUrl();
  const supabaseAnonKey = getPublicSupabaseAnonKey();

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized: Invalid Bearer token' }, { status: 401 });
  }

  const authenticatedUserId = user.id;

  const supabase = createServerSupabaseClient();

  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const body = bodyJson as ProductTryOnBody;

  try {
    const tryOnData: HandleTryOnResult = await handleTryOn(
      {
        userId: authenticatedUserId,
        productId,
        userPhotoUrl: body.userPhotoUrl ?? body.avatarGlbUrl,
        productImageUrl: body.productImageUrl ?? body.clothingGlbUrl,
        category: body.category,
        garments: body.garments,
      },
      supabase,
    );

    const fitScore = getFitScore(tryOnData.fitLabel);

    const heatmapUrl: string | null = null;

    const result: TryOnResult = {
      id: `res_${productId}_${authenticatedUserId}_${Date.now()}`,
      userId: authenticatedUserId,
      productId,
      result_url: tryOnData.resultUrl,
      resultImage: tryOnData.resultUrl,
      fitScore,
      sizeRecommendation: tryOnData.recommendedSize,
      status: 'ready',
    };

    return NextResponse.json({
      ...result,
      signedExpiry: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[/api/tryon/[productId]] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
