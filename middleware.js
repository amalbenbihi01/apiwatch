import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'apiwatch_session';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_me_in_prod';
const key = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, key, { algorithms: ['HS256'] });
      isAuthenticated = true;
    } catch (e) {
      isAuthenticated = false;
    }
  }

  const isProtectedPath = pathname.startsWith('/dashboard');
  const isGuestOnlyPath = pathname === '/login' || pathname === '/register';

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isGuestOnlyPath && isAuthenticated) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
