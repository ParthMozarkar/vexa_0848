import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface TrendsRequest {
  query: string;
  style?: string;
  category?: string;
}

export interface TrendResult {
  title: string;
  content: string;
  designPrompt: string;
}

interface TrendsResponse {
  trends: TrendResult[];
}

const ANAKIN_BASE = 'https://api.anakin.io/v1';

async function searchWithAnakin(query: string, apiKey: string): Promise<string> {
  try {
    const res = await fetch(`${ANAKIN_BASE}/search`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: query, limit: 8 }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return '';
    const data = await res.json() as {
      results?: Array<{ snippet?: string; title?: string; url?: string }>;
    };
    return (data.results ?? [])
      .map(r => `## ${r.title ?? ''}\n${r.snippet ?? ''}`)
      .join('\n\n');
  } catch {
    return '';
  }
}

async function buildTrendCards(
  userQuery: string,
  searchContent: string,
  openaiKey: string
): Promise<TrendResult[]> {
  const openai = new OpenAI({ apiKey: openaiKey });

  const systemMsg = `You are a fashion trend analyst. Given web search data about fashion trends,
extract 6 specific, distinct trend variations related to the user's query.
Output ONLY a JSON array, no markdown fences.`;

  const userMsg = `User wants: "${userQuery}"

Web data:
${searchContent.slice(0, 6000)}

Return exactly 6 trend cards as a JSON array:
[
  {
    "title": "Short catchy trend name",
    "content": "One sentence describing this specific trend",
    "designPrompt": "Very detailed garment description for AI image generation: fabric, color, pattern, cut, fit, style details"
  }
]
JSON array only. No wrapping.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: userMsg },
    ],
    temperature: 0.8,
    max_tokens: 800,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? '[]';
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(cleaned) as Array<Record<string, unknown>>;
  if (!Array.isArray(parsed)) throw new Error('Invalid trend data from OpenAI');

  return parsed.slice(0, 6).map(t => ({
    title: (t.title as string) || 'Fashion Trend',
    content: (t.content as string) || '',
    designPrompt: (t.designPrompt as string) || (t.title as string) || userQuery,
  }));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as TrendsRequest;
    const { query, style, category } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const anakinKey = process.env.ANAKIN_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ trends: [] } satisfies TrendsResponse);
    }

    const searchQuery = [query, style, category, 'fashion trend 2025 India']
      .filter(Boolean)
      .join(' ');

    let searchContent = '';
    if (anakinKey) {
      searchContent = await searchWithAnakin(searchQuery, anakinKey);
    }

    const trends = await buildTrendCards(
      query,
      searchContent || `Use your knowledge of current fashion trends related to "${query}".`,
      openaiKey
    );

    return NextResponse.json({ trends } satisfies TrendsResponse);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/studio/trends]', msg);
    return NextResponse.json({ trends: [] } satisfies TrendsResponse);
  }
}
