import { NextResponse, type NextRequest } from 'next/server';
import { readSessionToken, SESSION_COOKIE } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login' || pathname === '/api/admin/login') return NextResponse.next();

  const adminId = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (adminId) return NextResponse.next();

  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const login = new URL('/admin/login', request.url);
  if (pathname !== '/admin') login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
