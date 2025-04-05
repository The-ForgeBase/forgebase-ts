import { H3Event, getCookie, setCookie, deleteCookie, createError, sendRedirect } from 'h3';
import { ForgebaseWebAuth } from '../ForgebaseWebAuth';
import { ForgebaseWebAuthConfig, User } from '../types';
import { STORAGE_KEYS } from '../storage';

/**
 * Auth state from server-side for Nitro
 */
export interface NitroAuthState {
  user: User | null;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Options for auth middleware
 */
export interface NitroAuthOptions {
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
 * Create an auth instance for Nitro server
 */
export function createNitroAuth(
  config: ForgebaseWebAuthConfig
): ForgebaseWebAuth {
  // Create auth instance with SSR flag
  return new ForgebaseWebAuth({
    ...config,
    ssr: true
  });
}

/**
 * Get auth state from cookies in Nitro event
 */
export function getNitroAuthState(event: H3Event): NitroAuthState {
  const accessToken = getCookie(event, STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = getCookie(event, STORAGE_KEYS.REFRESH_TOKEN);
  let user: User | null = null;
  
  try {
    const userJson = getCookie(event, STORAGE_KEYS.USER);
    if (userJson) {
      user = JSON.parse(userJson);
    }
  } catch (error) {
    console.error('Failed to parse user from cookie:', error);
  }
  
  return {
    user,
    accessToken,
    refreshToken
  };
}

/**
 * Check if the user is authenticated in a Nitro event
 */
export function isNitroAuthenticated(event: H3Event): boolean {
  const { accessToken } = getNitroAuthState(event);
  return !!accessToken;
}

/**
 * Get the current user in a Nitro event
 */
export function getNitroUser(event: H3Event): User | null {
  const { user } = getNitroAuthState(event);
  return user;
}

/**
 * Protect a route in a Nitro event handler
 * @param event The H3Event
 * @param redirectTo Where to redirect if not authenticated
 */
export function protectNitroRoute(event: H3Event, redirectTo = '/login'): void {
  if (!isNitroAuthenticated(event)) {
    sendRedirect(event, redirectTo);
  }
}

/**
 * Set auth cookies in a Nitro response
 */
export function setNitroAuthCookies(
  event: H3Event, 
  authState: NitroAuthState,
  options: {
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}
): void {
  const { user, accessToken, refreshToken } = authState;
  
  if (user) {
    setCookie(event, STORAGE_KEYS.USER, JSON.stringify(user), options);
  }
  
  if (accessToken) {
    setCookie(event, STORAGE_KEYS.ACCESS_TOKEN, accessToken, options);
  }
  
  if (refreshToken) {
    setCookie(event, STORAGE_KEYS.REFRESH_TOKEN, refreshToken, options);
  }
}

/**
 * Clear auth cookies in a Nitro response
 */
export function clearNitroAuthCookies(
  event: H3Event,
  options: {
    domain?: string;
    path?: string;
  } = {}
): void {
  deleteCookie(event, STORAGE_KEYS.USER, options);
  deleteCookie(event, STORAGE_KEYS.ACCESS_TOKEN, options);
  deleteCookie(event, STORAGE_KEYS.REFRESH_TOKEN, options);
}

/**
 * Middleware for authentication in Nitro
 * This should be used in a global middleware
 */
export function nitroAuthMiddleware(
  event: H3Event,
  options: NitroAuthOptions
): void {
  const { redirectUnauthenticated, redirectAuthenticated, publicPaths, authPaths } = options;
  
  // Get the path from the request
  const path = event.path || event.node.req.url || '';
  
  // Check if the path is in the public paths
  const isPublicPath = publicPaths?.some(publicPath => 
    path === publicPath || 
    path.startsWith(`${publicPath}/`)
  );
  
  // Check if the path is in the auth paths
  const isAuthPath = authPaths?.some(authPath => 
    path === authPath || 
    path.startsWith(`${authPath}/`)
  );
  
  // Get the token from cookies
  const isUserAuthenticated = isNitroAuthenticated(event);
  
  // Handle redirects for authenticated users
  if (isUserAuthenticated && redirectAuthenticated && isPublicPath) {
    sendRedirect(event, redirectAuthenticated);
    return;
  }
  
  // Handle redirects for unauthenticated users
  if (!isUserAuthenticated && redirectUnauthenticated && isAuthPath) {
    sendRedirect(event, redirectUnauthenticated);
    return;
  }
}

/**
 * Create a fetch function with authentication headers for Nitro
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
      headers
    });
  };
}
