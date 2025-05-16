import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { ForgebaseWebAuth } from '../../../ForgebaseWebAuth';
import { ForgebaseWebAuthConfig, User } from '../../../types';
import { STORAGE_KEYS } from '../../../storage';

/**
 * Fetch the current user from the server
 * @param apiUrl The base URL of your API
 * @param accessToken The access token
 * @returns The current user or null if not authenticated
 */
export async function fetchPageRouterUserFromServer(
  apiUrl: string,
  accessToken?: string
): Promise<User | null> {
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

/**
 * Auth state from server-side for Pages Router
 */
export interface PagesRouterAuthState {
  user: User | null;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Options for withAuth HOC
 */
export interface WithAuthOptions {
  /**
   * Auth configuration
   */
  authConfig: ForgebaseWebAuthConfig;

  /**
   * Redirect to this URL if user is not authenticated
   */
  redirectUnauthenticated?: string;

  /**
   * Redirect to this URL if user is authenticated
   */
  redirectAuthenticated?: string;

  /**
   * Whether to require authentication
   */
  requireAuth?: boolean;

  /**
   * Whether to fetch the user from the server
   * If true, the user will be fetched from the server using the access token
   */
  fetchUser?: boolean;
}

/**
 * Higher-order function to wrap getServerSideProps with authentication
 */
export function withAuth<
  P extends { [key: string]: any } = { [key: string]: any }
>(
  options: WithAuthOptions,
  getServerSidePropsFunc?: (
    context: GetServerSidePropsContext,
    auth: ForgebaseWebAuth,
    authState: PagesRouterAuthState
  ) => Promise<GetServerSidePropsResult<P>>
): (
  context: GetServerSidePropsContext
) => Promise<GetServerSidePropsResult<any>> {
  return async (context: GetServerSidePropsContext) => {
    const { req } = context;
    const cookies = req.cookies;

    // Get auth state from cookies
    const accessToken = cookies[STORAGE_KEYS.ACCESS_TOKEN];
    const refreshToken = cookies[STORAGE_KEYS.REFRESH_TOKEN];

    // User is no longer stored in cookies, it should be fetched from the server
    // using the accessToken when needed
    const authState: PagesRouterAuthState = {
      user: null,
      accessToken,
      refreshToken,
    };

    const isAuthenticated = !!accessToken;

    // Handle redirects
    if (
      options.requireAuth &&
      !isAuthenticated &&
      options.redirectUnauthenticated
    ) {
      return {
        redirect: {
          destination: options.redirectUnauthenticated,
          permanent: false,
        },
      };
    }

    if (
      !options.requireAuth &&
      isAuthenticated &&
      options.redirectAuthenticated
    ) {
      return {
        redirect: {
          destination: options.redirectAuthenticated,
          permanent: false,
        },
      };
    }

    // Create auth instance
    const auth = new ForgebaseWebAuth({
      ...options.authConfig,
      ssr: true,
    });

    // Fetch user from server if requested and authenticated
    if (options.fetchUser && isAuthenticated) {
      try {
        const user = await fetchPageRouterUserFromServer(
          options.authConfig.apiUrl,
          accessToken
        );
        authState.user = user;
      } catch (error) {
        console.error('Failed to fetch user in withAuth:', error);
      }
    }

    // Call the wrapped getServerSideProps function if provided
    if (getServerSidePropsFunc) {
      try {
        const result = await getServerSidePropsFunc(context, auth, authState);

        // Handle redirect result
        if ('redirect' in result) {
          return result;
        }

        // Handle notFound result
        if ('notFound' in result) {
          return result;
        }

        // Merge props with auth state
        return {
          props: {
            ...result.props,
            ...authState,
          },
        };
      } catch (error) {
        console.error('Error in getServerSideProps:', error);
        throw error;
      }
    }

    // Return auth state as props
    return {
      props: authState as any,
    };
  };
}
