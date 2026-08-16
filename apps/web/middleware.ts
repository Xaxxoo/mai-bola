import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/intro', '/offline'];
const AUTH_PATHS = ['/login', '/register'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasRefreshToken = req.cookies.has('rt');

  // Authenticated users hitting /login or /register → redirect to home
  if (hasRefreshToken && AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Unauthenticated users hitting protected routes → redirect to login
  if (
    !hasRefreshToken &&
    !PUBLIC_PATHS.some((p) => pathname.startsWith(p)) &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/icons') &&
    !pathname.match(/\.(svg|png|ico|json|js|css)$/)
  ) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw\\.js).*)'],
};
