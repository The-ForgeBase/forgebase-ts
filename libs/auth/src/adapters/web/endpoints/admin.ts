import { AutoRouter, AutoRouterType, RouteEntry } from 'itty-router';
import { InternalAdminManager } from '../../../admin/internal-admin-manager';
import { AdminRequest } from './admin/types';
import { WebAuthConfig } from '..';
import { DynamicAuthManager } from '../../../authManager';

export class AdminApi {
  private router: AutoRouterType<AdminRequest>;
  private authManager: DynamicAuthManager;
  private adminManager: InternalAdminManager;
  private config: WebAuthConfig;
  private registeredRoutes: RouteEntry[];

  constructor(options: {
    authManager: DynamicAuthManager;
    adminManager: InternalAdminManager;
    config: WebAuthConfig;
  }) {
    this.authManager = options.authManager;
    this.adminManager = options.adminManager;
    this.config = options.config;
    this.router = AutoRouter<AdminRequest>({
      base: options.config.basePath || '/auth/admin',
    });
    this.setupRoutes();

    this.registeredRoutes = this.router.routes;

    console.log(this.registeredRoutes);
  }

  private setupRoutes() {
    this.router.get('/providers', async (request: AdminRequest) => {
      const providers = await this.authManager.getProviders();
      return new Response(JSON.stringify(providers), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  }

  getRoutes(): RouteEntry[] {
    return this.registeredRoutes;
  }

  getRouter(): AutoRouterType<AdminRequest> {
    return this.router;
  }

  async handleRequest(req: AdminRequest): Promise<Response> {
    return this.router.fetch(req);
  }
}

export * from './admin/types';
export * from './admin/middleware';
