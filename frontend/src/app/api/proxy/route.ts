import { NextRequest, NextResponse } from 'next/server';
import { isSafePublicImageUrl } from '@/lib/safeProxyUrl';
import { validateProxyUrl } from '@/lib/ssrfGuard';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }

  // SSRF guard — allowlist + scheme + private-IP check
  const validation = validateProxyUrl(imageUrl);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  if (!isSafePublicImageUrl(imageUrl)) {
    return new NextResponse('URL not allowed', { status: 400 });
  }

  try {
    const response = await fetch(validation.parsed.toString(), {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed: ${response.statusText}` },
        { status: response.status },
      );
    }

    // Enforce 10 MB response size limit via streaming
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: 'Empty upstream response' }, { status: 502 });
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        reader.cancel().catch(() => undefined);
        return NextResponse.json({ error: 'Response exceeds 10 MB limit' }, { status: 413 });
      }
      chunks.push(value);
    }

    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'image/png');
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');

    return new NextResponse(combined, { status: 200, headers });
  } catch (error) {
    logger.error('Proxy error', { error: String(error) });
    return NextResponse.json({ error: 'Error fetching image' }, { status: 500 });
  }
}
