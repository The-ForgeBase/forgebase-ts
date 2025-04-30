// Express Auth Adapter Entry Point
import { ExpressAuthConfig } from './types';
import { createAuthRouter } from './endpoints/auth';
import { createAdminRouter } from './endpoints/admin';
import * as middleware from './middleware';
import * as utils from './utils';
import { DynamicAuthManager } from '../../authManager';
import { InternalAdminManager } from '../../admin/internal-admin-manager';
import { Router } from 'express';

/**
 * Initialize the Express Auth system and return routers to mount in your app.
 * Example usage:
 *   const { authRouter, adminRouter } = initializeExpressAuth(authManager, config)
 */
export function initializeExpressAuth(authManager: DynamicAuthManager, adminManager: InternalAdminManager, config: ExpressAuthConfig): { authRouter: Router; adminRouter: Router } {
  return {
    authRouter: createAuthRouter(authManager, adminManager, config),
    adminRouter: createAdminRouter(authManager, config),
    // ...add more routers as you implement them
  };
}

export { createAuthRouter, createAdminRouter, middleware, utils };
export type { ExpressAuthConfig };
