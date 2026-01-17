import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Защищенные маршруты (дашборд)
  const protectedRoutes = ['/taste-map', '/tracks', '/emotions', '/evolution', '/galaxy', '/friends'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  // Проверяем наличие токена авторизации Last.fm
  const token = request.cookies.get('lastfm_session_key');
  
  // Если пользователь не авторизован и пытается зайти на защищенный маршрут
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/auth/lastfm', request.url));
  }
  
  // Если пользователь авторизован и пытается зайти на страницу авторизации
  if (pathname.startsWith('/auth') && token) {
    return NextResponse.redirect(new URL('/taste-map', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp).*)',
  ],
};
