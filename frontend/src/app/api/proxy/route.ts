import { NextRequest, NextResponse } from 'next/server';
import { isSafePublicImageUrl } from '@/lib/safeProxyUrl';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing URL', { status: 400 });
  }

  if (!isSafePublicImageUrl(imageUrl)) {
    return new NextResponse('URL not allowed', { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'image/png');
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');

    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
