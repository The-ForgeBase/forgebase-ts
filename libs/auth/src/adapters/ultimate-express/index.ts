// Express Auth Adapter Entry Point
import { UltimateExpressAuthConfig } from './types';
import { createAuthRouter } from './endpoints/auth';
import { createAdminRouter } from './endpoints/admin';
import * as middleware from './middleware';
import * as utils from './utils';
import { DynamicAuthManager } from '../../authManager';
import { InternalAdminManager } from '../../admin/internal-admin-manager';
import { Router } from 'ultimate-express';
import { ContainerDependencies, createAuthContainer } from '../../container';
import { AwilixContainer } from 'awilix';
import { AuthCradle } from '../../container';

export type AuthClientConfig = {
  config: UltimateExpressAuthConfig;
  deps: ContainerDependencies;
};

export const createUltimateExpressAuthClient = (
  options: AuthClientConfig
): {
  container: AwilixContainer<AuthCradle>;
  config: UltimateExpressAuthConfig;
} => {
  const container = createAuthContainer(options.deps);

  return {
    container,
    config: options.config,
  };
};

/**
 * Initialize the Express Auth system and return routers to mount in your app.
 * Example usage:
 *   const { authRouter, adminRouter } = initializeExpressAuth(authManager, config)
 */
export function initializeUltimateExpressAuth(
  authManager: DynamicAuthManager,
  adminManager: InternalAdminManager,
  config: UltimateExpressAuthConfig
): { authRouter: Router; adminRouter: Router } {
  return {
    authRouter: createAuthRouter(authManager, adminManager, config),
    adminRouter: createAdminRouter(authManager, config),
  };
}

export { createAuthRouter, createAdminRouter, middleware, utils };
export type { UltimateExpressAuthConfig };
