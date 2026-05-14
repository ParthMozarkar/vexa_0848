
import { NextRequest, NextResponse } from 'next/server';
import { BrandPortal } from '@/lib/enterprise/BrandPortal';
import { SecurityEngine } from '@/lib/enterprise/SecurityEngine';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const tenantId = searchParams.get('tenantId');

  try {
    switch (type) {
      case 'dashboard':
        if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
        return NextResponse.json(await BrandPortal.getTenantAnalytics(tenantId));
      
      case 'docs':
        return NextResponse.json(await BrandPortal.generateDocs());
      
      case 'security':
        const userId = searchParams.get('userId');
        const region = (searchParams.get('region') as any) || 'US';
        return NextResponse.json(await SecurityEngine.checkResidency(userId || 'unknown', region));

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
