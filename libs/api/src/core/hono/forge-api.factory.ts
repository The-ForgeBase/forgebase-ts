import { Hono } from 'hono';
import { BaaSConfig } from '../../types';
import { DatabaseService } from '../database';
import { StorageService } from '../storage';
import { ForgeApiService } from './forge-api.service';
import { ForgeApiHandler } from './forge-api.handler';
import { SSEManager } from '@forgebase-ts/database';

export interface ForgeApiOptions<Env = any> {
  config: Partial<BaaSConfig>;
  db?: DatabaseService;
  storage?: StorageService;
  app?: Hono<Env>;
}

export function createHonoForgeApi<Env = any>(
  options: ForgeApiOptions<Env>,
  config: {
    enableSchemaEndpoints?: boolean;
    enableDataEndpoints?: boolean;
    enablePermissionEndpoints?: boolean;
  }
): {
  app: Hono<Env>;
  dbService: DatabaseService;
  storageService: StorageService;
} {
  // Create services
  const dbService =
    options.db || new DatabaseService(options.config.services.db);
  const storageService =
    options.storage || new StorageService(options.config.services.storage);

  // Create ForgeApiService
  const forgeApiService = new ForgeApiService(
    options.config,
    storageService,
    dbService
  );

  // Create ForgeApiHandler
  const forgeApiHandler = new ForgeApiHandler(forgeApiService, config);

  // Use provided app or create a new one
  const app = options.app || new Hono<Env>();

  const realtimeAdapter = dbService.getForgeDatabase().realtimeAdapter;

  // Mount the ForgeApiHandler routes
  const prefix = forgeApiService.getConfig().prefix || '';
  app.route(prefix, forgeApiHandler.getApp());

  // Mount the SSE handler if the realtime adapter is SSE
  if (realtimeAdapter && realtimeAdapter instanceof SSEManager) {
    app.get(`${prefix}/sse`, async (c) => {
      const request = c.req.raw;
      // The handleRequest from the sseAdapter handles the underlying request/response
      // User context is typically handled during the 'upgrade' hook within the SSEManager
      // by reading headers, not passed directly here.
      const response = await realtimeAdapter.handleRequest(request);
      return response;
    });
    app.post(`${prefix}/sse`, async (c) => {
      const request = c.req.raw;
      // The handleRequest from the sseAdapter handles the underlying request/response
      // User context is typically handled during the 'upgrade' hook within the SSEManager
      // by reading headers, not passed directly here.
      const response = await realtimeAdapter.handleRequest(request);
      return response;
    });
  }

  return { app, dbService, storageService };
}
