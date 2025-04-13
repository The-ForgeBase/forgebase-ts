import { Hono } from 'hono';
import { BaaSConfig } from '../../types';
import { DatabaseService } from '../database';
import { StorageService } from '../storage';
import { ForgeApiService } from './forge-api.service';
import { ForgeApiHandler } from './forge-api.handler';

export interface ForgeApiOptions<Env = any> {
  config?: Partial<BaaSConfig>;
  db?: DatabaseService;
  storage?: StorageService;
  app?: Hono<Env>;
}

export function createForgeApi<Env = any>(
  options: ForgeApiOptions<Env> = {}
): Hono<Env> {
  // Create services
  const dbService =
    options.db || new DatabaseService(options.config?.services?.db);
  const storageService =
    options.storage || new StorageService(options.config?.services?.storage);

  // Create ForgeApiService
  const forgeApiService = new ForgeApiService(
    options.config || {},
    storageService,
    dbService
  );

  // Create ForgeApiHandler
  const forgeApiHandler = new ForgeApiHandler(forgeApiService);

  // Use provided app or create a new one
  const app = options.app || new Hono<Env>();

  // Mount the ForgeApiHandler routes
  const prefix = forgeApiService.getConfig().prefix || '';
  app.route(prefix, forgeApiHandler.getApp());

  return app;
}
