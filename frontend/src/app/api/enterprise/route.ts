
import { NextRequest, NextResponse } from 'next/server';
import { EnterpriseAnalytics } from '@/lib/enterprise/EnterpriseAnalytics';
import { TenantManager } from '@/lib/enterprise/TenantManager';
import { EcommerceBridge } from '@/lib/enterprise/EcommerceBridge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId');
  const type = searchParams.get('type');

  if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

  try {
    switch (type) {
      case 'dashboard':
        const { BrandPortal } = require('@/lib/enterprise/BrandPortal');
        const stats = await BrandPortal.getRevenueLift(orgId);
        return NextResponse.json(stats);
      
      case 'docs':
        const { BrandPortal: BP } = require('@/lib/enterprise/BrandPortal');
        return NextResponse.json({ url: await BP.generateTenantDocs(orgId) });

      case 'branding':
        const org = await TenantManager.getOrgForUser(orgId); // Simplified lookup
        return NextResponse.json(org?.branding_config || {});

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId, type, data, topic } = await req.json();

    switch (type) {
      case 'shopify_webhook':
        await EcommerceBridge.handleShopifyWebhook(orgId, topic, data);
        return NextResponse.json({ success: true });
      
      case 'track_conversion':
        await EnterpriseAnalytics.trackConversion(orgId, data.eventType, data.productId, data.metadata);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
