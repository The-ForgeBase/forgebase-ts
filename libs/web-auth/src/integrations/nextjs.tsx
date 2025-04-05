import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { ForgebaseWebAuth } from '../ForgebaseWebAuth';
import { ForgebaseWebAuthConfig, User } from '../types';
import { STORAGE_KEYS } from '../storage';

/**
 * Auth state from server-side
 */
export interface ServerAuthState {
  user: User | null;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Options for withAuth HOC
 */
export interface WithAuthOptions {
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
}

/**
 * Create an auth instance for server-side rendering
 */
export function createServerAuth(
  _context: GetServerSidePropsContext,
  config: ForgebaseWebAuthConfig
): ForgebaseWebAuth {
  // Create auth instance with SSR flag
  const auth = new ForgebaseWebAuth({
    ...config,
    ssr: true,
  });

  return auth;
}

/**
 * Get auth state from cookies in server-side context
 */
export function getAuthStateFromCookies(
  context: GetServerSidePropsContext
): ServerAuthState {
  const cookies = context.req.cookies;
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
 * Higher-order function to wrap getServerSideProps with authentication
 */
export function withAuth<P = Record<string, unknown>>(
  options: WithAuthOptions,
  getServerSidePropsFunc?: (
    context: GetServerSidePropsContext,
    auth: ForgebaseWebAuth,
    authState: ServerAuthState
  ) => Promise<GetServerSidePropsResult<P>>
): (
  context: GetServerSidePropsContext
) => Promise<GetServerSidePropsResult<P & ServerAuthState>> {
  return async (context) => {
    // Create server-side auth instance
    const auth = createServerAuth(context, options.authConfig);

    // Get auth state from cookies
    const authState = getAuthStateFromCookies(context);
    const isAuthenticated = !!authState.accessToken;

    // Handle redirects
    if (options.redirectUnauthenticated && !isAuthenticated) {
      return {
        redirect: {
          destination: options.redirectUnauthenticated,
          permanent: false,
        },
      };
    }

    if (options.redirectAuthenticated && isAuthenticated) {
      return {
        redirect: {
          destination: options.redirectAuthenticated,
          permanent: false,
        },
      };
    }

    // Call the wrapped getServerSideProps function if provided
    if (getServerSidePropsFunc) {
      const result = await getServerSidePropsFunc(context, auth, authState);

      // Handle redirect or notFound
      if ('redirect' in result) {
        return result as unknown as GetServerSidePropsResult<
          P & ServerAuthState
        >;
      }

      if ('notFound' in result) {
        return result as unknown as GetServerSidePropsResult<
          P & ServerAuthState
        >;
      }

      // Merge props with auth state
      return {
        props: {
          ...result.props,
          ...authState,
        } as unknown as P & ServerAuthState,
      };
    }

    // Return auth state as props
    return {
      props: authState as unknown as P & ServerAuthState,
    };
  };
}
