import { H3Event } from 'h3';
import { ForgebaseWebAuth } from '../../ForgebaseWebAuth';
import { ForgebaseWebAuthConfig, User } from '../../types';
import { STORAGE_KEYS } from '../../storage';

/**
 * Auth state from server-side for Nitro
 */
export interface NitroAuthState {
  user: User | null;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Options for nitroAuthMiddleware
 */
export interface NitroAuthMiddlewareOptions {
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
 * Get auth state from cookies in Nitro
 */
export function getNitroAuthState(event: H3Event): NitroAuthState {
  const cookies = parseCookies(event);
  const accessToken = cookies[STORAGE_KEYS.ACCESS_TOKEN];
  const refreshToken = cookies[STORAGE_KEYS.REFRESH_TOKEN];
  let user: User | null = null;

  try {
    const userJson = cookies[STORAGE_KEYS.USER];
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
 * Check if the user is authenticated in Nitro
 */
export function isNitroAuthenticated(event: H3Event): boolean {
  const { accessToken } = getNitroAuthState(event);
  return !!accessToken;
}

/**
 * Get the current user in Nitro
 */
export function getNitroUser(event: H3Event): User | null {
  const { user } = getNitroAuthState(event);
  return user;
}

/**
 * Protect a route in Nitro
 * @param event H3Event
 * @param redirectTo Where to redirect if not authenticated
 */
export function protectNitroRoute(event: H3Event, redirectTo = '/login'): void {
  if (!isNitroAuthenticated(event)) {
    // Redirect to login
    event.node.res.statusCode = 302;
    event.node.res.setHeader('Location', redirectTo);
    event.node.res.end();
  }
}

/**
 * Create a fetch function with authentication headers
 * Use this in Nitro to make authenticated API calls
 */
export function createNitroAuthenticatedFetch(event: H3Event) {
  const { accessToken, refreshToken } = getNitroAuthState(event);

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

/**
 * Middleware for authentication in Nitro
 */
export function nitroAuthMiddleware(
  event: H3Event,
  options: NitroAuthMiddlewareOptions
): void {
  const {
    redirectUnauthenticated,
    redirectAuthenticated,
    publicPaths,
    authPaths,
  } = options;

  // Get the path from the request
  const path = event.node.req.url || '/';

  // Check if the path is in the public paths
  const isPublicPath = publicPaths?.some(
    (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`)
  );

  // Check if the path is in the auth paths
  const isAuthPath = authPaths?.some(
    (authPath) => path === authPath || path.startsWith(`${authPath}/`)
  );

  // Get the token from cookies
  const isUserAuthenticated = isNitroAuthenticated(event);

  // Handle redirects for authenticated users
  if (isUserAuthenticated && redirectAuthenticated && isPublicPath) {
    event.node.res.statusCode = 302;
    event.node.res.setHeader('Location', redirectAuthenticated);
    event.node.res.end();
    return;
  }

  // Handle redirects for unauthenticated users
  if (!isUserAuthenticated && redirectUnauthenticated && isAuthPath) {
    event.node.res.statusCode = 302;
    event.node.res.setHeader('Location', redirectUnauthenticated);
    event.node.res.end();
    return;
  }
}

/**
 * Parse cookies from the request
 */
function parseCookies(event: H3Event): Record<string, string> {
  const cookieHeader = event.node.req.headers.cookie || '';
  const cookies: Record<string, string> = {};

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    if (name) {
      const value = parts[1]?.trim();
      cookies[name] = value || '';
    }
  });

  return cookies;
}
