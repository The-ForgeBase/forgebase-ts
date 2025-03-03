import { Knex } from 'knex';
import { ConfigStore } from '../types';
import { InternalAdminManager } from './internal-admin-manager';
import { KnexAdminService } from '../services/admin.knex.service';
import { BasicAdminAuthProvider } from '../services/admin-auth.provider';
import { KnexAdminSessionManager } from '../services/admin-session.service';

/**
 * Factory function to create an InternalAdminManager
 */
export function createInternalAdminManager(
  knex: Knex,
  configStore: ConfigStore,
  options?: {
    jwtSecret?: string;
    tokenExpiry?: string;
  }
): InternalAdminManager {
  const adminService = new KnexAdminService(knex);
  const adminAuthProvider = new BasicAdminAuthProvider(adminService);
  const sessionManager = new KnexAdminSessionManager(
    knex,
    adminService,
    options
  );

  const adminManager = new InternalAdminManager(
    knex,
    adminAuthProvider,
    sessionManager,
    configStore
  );

  return adminManager;
}

// Export admin components
export * from './internal-admin-manager';
export * from '../types/admin';
