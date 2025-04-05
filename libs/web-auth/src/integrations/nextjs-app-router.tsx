import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { ForgebaseWebAuth } from '../ForgebaseWebAuth';
import { ForgebaseWebAuthConfig, User } from '../types';
import { STORAGE_KEYS } from '../storage';

/**
 * Auth state from server-side for App Router
 */
export interface AppRouterAuthState {
  user: User | null;
  accessToken?: string;
  refreshToken?: string;
}

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
 * Create an auth instance for server components in App Router
 */
export function createAppRouterAuth(
  config: ForgebaseWebAuthConfig
): ForgebaseWebAuth {
  // Create auth instance with SSR flag
  return new ForgebaseWebAuth({
    ...config,
    ssr: true,
  });
}

/**
 * Get auth state from cookies in server component for App Router
 */
export function getAppRouterAuthState(): AppRouterAuthState {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(STORAGE_KEYS.ACCESS_TOKEN)?.value;
  const refreshToken = cookieStore.get(STORAGE_KEYS.REFRESH_TOKEN)?.value;
  let user: User | null = null;

  try {
    const userJson = cookieStore.get(STORAGE_KEYS.USER)?.value;
    if (userJson) {
      user = JSON.parse(userJson);
    }
  } catch (error) {
    console.error('Failed to parse user from cookie:', error);
  }

  return {
    user,
    accessToken,
    refreshToken,
  };
}

/**
 * Check if the user is authenticated in a server component
 */
export function isAuthenticated(): boolean {
  const { accessToken } = getAppRouterAuthState();
  return !!accessToken;
}

/**
 * Get the current user in a server component
 */
export function getCurrentUser(): User | null {
  const { user } = getAppRouterAuthState();
  return user;
}

/**
 * Protect a route in a server component
 * @param redirectTo Where to redirect if not authenticated
 */
export function protectRoute(redirectTo = '/login'): void {
  if (!isAuthenticated()) {
    redirect(redirectTo);
  }
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

/**
 * Auth Provider props for client components
 */
export interface AppRouterAuthProviderProps {
  user: User | null;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Get auth provider props for client components
 * Use this in a Server Component to pass auth state to client components
 */
export function getAppRouterAuthProps(): AppRouterAuthProviderProps {
  const { user, accessToken, refreshToken } = getAppRouterAuthState();
  return {
    user,
    accessToken,
    refreshToken,
  };
}

/**
 * Create a fetch function with authentication headers
 * Use this in Server Components to make authenticated API calls
 */
export function createAuthenticatedFetch() {
  const { accessToken, refreshToken } = getAppRouterAuthState();

  return async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    if (refreshToken) {
      headers.set('X-Refresh-Token', refreshToken);
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };
}
