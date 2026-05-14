import { NextRequest, NextResponse } from 'next/server';
import { requireAdminKey } from '@/lib/adminAuth';
import { getProviders, initializeRegistry } from '@/lib/providers/registry';
import type { ProviderCapability } from '@/lib/providers/types';
import type { ProviderHealthStatus } from '@/types/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const adminCheck = requireAdminKey(req);
  if (adminCheck) return adminCheck;

  // Ensure registry is populated (may not be initialized in serverless context)
  initializeRegistry();

  const capabilities: ProviderCapability[] = ['tryon', 'design', 'model-gen', 'trends', 'tryon-video'];
  const seen = new Set<string>();
  const results: ProviderHealthStatus[] = [];

  for (const cap of capabilities) {
    const providers = getProviders(cap);
    for (const provider of providers) {
      if (seen.has(provider.name)) continue;
      seen.add(provider.name);
      try {
        const start = Date.now();
        const health = await provider.healthCheck();
        results.push({
          name: provider.name,
          capabilities: provider.capabilities,
          healthy: health.healthy,
          latencyMs: health.latencyMs || Date.now() - start,
          error: health.error,
          checkedAt: new Date().toISOString(),
        });
      } catch (err) {
        results.push({
          name: provider.name,
          capabilities: provider.capabilities,
          healthy: false,
          latencyMs: 0,
          error: err instanceof Error ? err.message : String(err),
          checkedAt: new Date().toISOString(),
        });
      }
    }
  }

  return NextResponse.json({ providers: results });
}
