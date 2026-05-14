
import { NextRequest, NextResponse } from 'next/server';
import { AIStylist } from '@/lib/fashion-intelligence/AIStylist';
import { TrendEngine } from '@/lib/fashion-intelligence/TrendEngine';
import { WardrobeSystem } from '@/lib/fashion-intelligence/WardrobeSystem';
import { PersonalizationEngine } from '@/lib/fashion-intelligence/PersonalizationEngine';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const type = searchParams.get('type'); // 'recommend', 'trends', 'wardrobe'

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  try {
    switch (type) {
      case 'recommend':
        const occasion = searchParams.get('occasion') || 'daily';
        const isBrief = searchParams.get('brief') === 'true';
        if (isBrief) {
          const { ProactiveAssistant } = require('@/lib/fashion-intelligence/ProactiveAssistant');
          return NextResponse.json(await ProactiveAssistant.generateMorningBrief(userId));
        }
        const recs = await AIStylist.recommendOutfits(userId, { occasion });
        return NextResponse.json(recs);
      
      case 'visual_search':
        const { VisualIntelligenceEngine } = require('@/lib/fashion-intelligence/VisualIntelligenceEngine');
        const img = searchParams.get('imageUrl');
        if (!img) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 });
        return NextResponse.json(await VisualIntelligenceEngine.getVisualSimilarity(img));

      case 'trends':
        const trends = await TrendEngine.getActiveTrends();
        return NextResponse.json(trends);

      case 'wardrobe':
        const items = await WardrobeSystem.getWardrobe(userId);
        return NextResponse.json(items);

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, type, data } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    switch (type) {
      case 'interaction':
        await PersonalizationEngine.updatePreferences(userId, data);
        return NextResponse.json({ success: true });
      
      case 'wardrobe_add':
        await WardrobeSystem.addToWardrobe(userId, data);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
