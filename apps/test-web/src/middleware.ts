import { NextRequest } from 'next/server';
import { StorageType } from '@forgebase-ts/web-auth';
import { authMiddleware } from '@forgebase-ts/web-auth/frameworks/nextjs/app-router';

export function middleware(request: NextRequest) {
  return authMiddleware(request, {
    authConfig: {
      apiUrl: 'http://localhost:8000/api',
      storageType: StorageType.COOKIE,
      useCookies: true,
      withCredentials: true,
      secureCookies: false, // Set to true in production
    },
    redirectUnauthenticated: '/login',
    redirectAuthenticated: '/dashboard',
    publicPaths: ['/', '/login', '/register', '/api'],
    authPaths: ['/dashboard', '/profile', '/database-test'],
  });
}

// See: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
