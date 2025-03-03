import { ConfigStore } from '../../types';
import { InternalAdminManager, createInternalAdminManager } from '../../admin';
import { Knex } from 'knex';

/**
 * Configuration options for Admin feature in NestJS
 */
export interface NestAdminFactoryOptions {
  knex: Knex;
  configStore: ConfigStore;
  jwtSecret?: string;
  tokenExpiry?: string;
}

export function createNestAdminManager(
  options: NestAdminFactoryOptions
): InternalAdminManager {
  return createInternalAdminManager(options.knex, options.configStore, {
    jwtSecret: options.jwtSecret,
    tokenExpiry: options.tokenExpiry,
  });
}

export async function initializeNestAdminManager(
  options: NestAdminFactoryOptions
): Promise<InternalAdminManager> {
  const adminManager = createNestAdminManager(options);
  await adminManager.initialize();
  return adminManager;
}
