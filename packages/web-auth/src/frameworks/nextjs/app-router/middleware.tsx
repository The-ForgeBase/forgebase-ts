import { NextRequest, NextResponse } from 'next/server';
import { ForgebaseWebAuthConfig } from '../../../types';
import { STORAGE_KEYS } from '../../../storage';

/**
 * Options for auth middleware
 */
export interface AuthMiddlewareOptions {
  /**
   * Redirect to this URL if user is not authenticated
   */
  redirectUnauthenticated?: string;

  /**
   * Redirect to this URL if user is authenticated
   */
  redirectAuthenticated?: string;

  /**
   * Auth configuration
   */
  authConfig: ForgebaseWebAuthConfig;

  /**
   * Public paths that don't require authentication
   */
  publicPaths?: string[];

  /**
   * Auth-only paths that require authentication
   */
  authPaths?: string[];
}

/**
 * Middleware for authentication
 * This should be used in middleware.ts
 */
export function authMiddleware(
  request: NextRequest,
  options: AuthMiddlewareOptions
): NextResponse {
  const {
    redirectUnauthenticated,
    redirectAuthenticated,
    publicPaths,
    authPaths,
  } = options;

  // Get the path from the request
  const path = request.nextUrl.pathname;

  // Check if the path is in the public paths
  const isPublicPath = publicPaths?.some(
    (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`)
  );

  // Check if the path is in the auth paths
  const isAuthPath = authPaths?.some(
    (authPath) => path === authPath || path.startsWith(`${authPath}/`)
  );

  // Get the token from cookies
  const cookieStore = request.cookies;
  const accessToken = cookieStore.get(STORAGE_KEYS.ACCESS_TOKEN)?.value;
  const isUserAuthenticated = !!accessToken;

  // Handle redirects for authenticated users
  if (isUserAuthenticated && redirectAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL(redirectAuthenticated, request.url));
  }

  // Handle redirects for unauthenticated users
  if (!isUserAuthenticated && redirectUnauthenticated && isAuthPath) {
    return NextResponse.redirect(new URL(redirectUnauthenticated, request.url));
  }

  // Continue with the request
  return NextResponse.next();
}
