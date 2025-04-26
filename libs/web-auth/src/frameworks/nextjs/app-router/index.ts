// Re-export server-side functions
export {
  getAppRouterAuthState,
  isAuthenticated,
  getCurrentUser,
  protectRoute,
  getAppRouterAuthProps,
  createAuthenticatedFetch,
  fetchUserFromServer,
  type AppRouterAuthState,
  type AppRouterAuthProviderProps,
} from './server';

// Re-export middleware
export { authMiddleware, type AuthMiddlewareOptions } from './middleware';

// Re-export client-side components
export { AppRouterAuthProvider, createAppRouterAuth } from './client';
