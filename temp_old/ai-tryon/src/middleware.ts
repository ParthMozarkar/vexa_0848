import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // TODO: validate x-vexa-key header for all /api/* routes
  // TODO: protect /dashboard and /tryon routes (require auth)
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/tryon/:path*'],
}
