import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/server';

export const runtime = 'nodejs';

/** Paths that don't require authentication. */
const PUBLIC_PREFIXES = ['/login', '/api/auth/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Exclude Next.js internals and the /generated/ image folder (Buffer needs to fetch images from it)
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|generated/).*)'],
};
