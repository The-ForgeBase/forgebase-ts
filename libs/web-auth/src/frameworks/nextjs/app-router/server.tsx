import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { User } from '../../../types';
import { STORAGE_KEYS } from '../../../storage';

/**
 * Auth state from server-side for App Router
 */
export interface AppRouterAuthState {
  user: User | null;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Get auth state from cookies in server component for App Router
 */
export function getAppRouterAuthState(): AppRouterAuthState {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(STORAGE_KEYS.ACCESS_TOKEN)?.value;
  const refreshToken = cookieStore.get(STORAGE_KEYS.REFRESH_TOKEN)?.value;

  // User is no longer stored in cookies, it should be fetched from the server
  // using the accessToken when needed
  return {
    user: null,
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
 * @deprecated This function always returns null as user data is no longer stored in cookies.
 * Use a server action or API route to fetch the user data from the server instead.
 */
export function getCurrentUser(): User | null {
  console.warn(
    'getCurrentUser() is deprecated. User data is no longer stored in cookies. Use a server action or API route to fetch the user data from the server instead.'
  );
  return null;
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
 *
 * Note: This function no longer returns the user object as it's not stored in cookies.
 * The user should be fetched from the server in a client component or using a server action.
 */
export function getAppRouterAuthProps(): AppRouterAuthProviderProps {
  const { accessToken, refreshToken } = getAppRouterAuthState();
  return {
    user: null, // User is no longer stored in cookies
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

/**
 * Fetch the current user from the server
 * Use this in Server Components or Server Actions to get the current user
 * @param apiUrl The base URL of your API
 * @returns The current user or null if not authenticated
 */
export async function fetchUserFromServer(
  apiUrl: string
): Promise<User | null> {
  const { accessToken } = getAppRouterAuthState();

  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user || null;
  } catch (error) {
    console.error('Failed to fetch user from server:', error);
    return null;
  }
}
