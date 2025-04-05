import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { ForgebaseWebAuth } from '../../../ForgebaseWebAuth';
import { ForgebaseWebAuthConfig, User } from '../../../types';
import { STORAGE_KEYS } from '../../../storage';

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
    const userJson = cookies[STORAGE_KEYS.USER];

    let user: User | null = null;
    try {
      if (userJson) {
        user = JSON.parse(userJson);
      }
    } catch (error) {
      console.error('Failed to parse user from cookie:', error);
    }

    const authState: PagesRouterAuthState = {
      user,
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
