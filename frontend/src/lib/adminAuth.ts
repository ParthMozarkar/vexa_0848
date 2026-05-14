/**
 * adminAuth.ts
 * Admin key guard for internal management routes.
 * Accepts key via x-admin-key header or Bearer Authorization.
 * Returns null when authorized, NextResponse with error when not.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function requireAdminKey(req: NextRequest): NextResponse | null {
  const adminKey = process.env.VEXA_ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
  }
  const provided =
    req.headers.get('x-admin-key') ??
    req.headers.get('authorization')?.replace('Bearer ', '');
  if (!provided || provided !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null; // authorized
}
