import {
  AutoRouter,
  AutoRouterType,
  error,
  IRequest,
  RouteEntry,
} from 'itty-router';
// import { StorageService } from '../storage';
import { DatabaseService } from '../database';
import {
  AuthenticationRequiredError,
  DataMutationParams,
  DataQueryParams,
  ExcludedTableError,
  PermissionDeniedError,
  UserContext,
} from '@forgebase-ts/database';
import { BaaSConfig } from '../../types';

export type IttyWebRequest = {
  userContext?: UserContext;
  isSystem?: boolean; // Add isSystem flag to request context
  [key: string]: any;
} & IRequest;

class IttyWebHandler {
  private router: AutoRouterType<IttyWebRequest>;
  private enableSchemaEndpoints = true;
  private enableDataEndpoints = true;
  private enablePermissionEndpoints = true;
  private config: BaaSConfig;
  // private storage: StorageService;
  private db: DatabaseService;
  private registeredRoutes: RouteEntry[];

  constructor(
    config: {
      enableSchemaEndpoints?: boolean;
      enableDataEndpoints?: boolean;
      enablePermissionEndpoints?: boolean;
    },
    fgConfig: Partial<BaaSConfig> = {}
  ) {
    this.config = {
      prefix: '/api',
      auth: {
        enabled: false,
        exclude: ['/auth/login', '/auth/register'],
      },
      services: {
        storage: {
          provider: 'local',
          config: {},
        },
        db: {
          provider: 'sqlite',
          config: {
            enforceRls: true,
          },
        },
      },
      ...fgConfig,
    };
    this.enableSchemaEndpoints = config.enableSchemaEndpoints ?? true;
    this.enableDataEndpoints = config.enableDataEndpoints ?? true;
    this.enablePermissionEndpoints = config.enablePermissionEndpoints ?? true;
    this.router = AutoRouter<IttyWebRequest>({
      base: fgConfig.prefix || this.config.prefix,
      before: [this.schemaGuard.bind(this)],
    });
    this.config = this.mergeConfigs(this.config, fgConfig);
    // Initialize services based on configuration
    // this.storage = new StorageService(this.config.services?.storage);
    this.db = new DatabaseService(this.config.services?.db);
    // Set up routes
    this.setupRoutes();

    this.registeredRoutes = this.router.routes;

    console.log(this.registeredRoutes.map((r) => r[3]));
  }

  private mergeConfigs(
    defaultConfig: BaaSConfig,
    userConfig: Partial<BaaSConfig>
  ): BaaSConfig {
    return {
      ...defaultConfig,
      ...userConfig,
      auth: {
        ...defaultConfig.auth,
        ...userConfig.auth,
      },
      services: {
        storage: {
          ...defaultConfig.services.storage,
          ...userConfig.services?.storage,
        },
        db: {
          ...defaultConfig.services.db,
          ...userConfig.services?.db,
        },
      },
    };
  }

  private handleError(error: any): Response {
    if (error instanceof ExcludedTableError) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'table does not exist',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    if (
      error instanceof AuthenticationRequiredError ||
      error instanceof PermissionDeniedError
    ) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: error.message,
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private schemaGuard(req: IttyWebRequest) {
    const route = new URL(req.url).pathname;
    console.log('route', route);
    if (
      (route.startsWith(`${this.config.prefix}/db/schema`) ||
        route.startsWith(`${this.config.prefix}/permissions`)) &&
      !req.isSystem
    ) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private setupRoutes() {
    if (this.enableDataEndpoints) {
      this.dataRoute();
    }

    if (this.enableSchemaEndpoints) {
      this.schemaRoute();
    }

    if (this.enablePermissionEndpoints) {
      this.permissionRoute();
    }
  }

  private dataRoute() {
    this.router.post(
      '/db/:tableName',
      async ({ json, params, userContext, isSystem }) => {
        try {
          const { tableName } = params;
          const { data } = await json();

          if (!data || typeof data !== 'object') {
            return new Response(
              JSON.stringify({ error: 'Invalid data format' }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          const result = await this.db.insert(
            tableName,
            {
              tableName: tableName,
              data,
            },
            userContext,
            isSystem
          );

          return new Response(JSON.stringify(result), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e) {
          return this.handleError(e);
        }
      }
    );

    this.router.get(
      '/db/:tableName',
      async ({ params, userContext, isSystem, query }) => {
        try {
          const { tableName } = params;
          const result = await this.db.query(
            tableName,
            query as DataQueryParams,
            userContext,
            isSystem
          );

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e) {
          return this.handleError(e);
        }
      }
    );

    this.router.get(
      '/db/:tableName/:id',
      async ({ params, userContext, isSystem }) => {
        try {
          // eslint-disable-next-line prefer-const
          let { tableName, id } = params as {
            tableName: string;
            id: number | string;
          };
          if (typeof id === 'string' && !isNaN(Number(id))) {
            id = Number(id);
          }

          const query: DataQueryParams = { filter: { id: id }, select: ['*'] };
          const result = await this.db.query(
            tableName,
            query,
            userContext,
            isSystem
          );

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e) {
          return this.handleError(e);
        }
      }
    );

    this.router.put(
      '/db/:tableName/:id',
      async ({ params, userContext, isSystem, json }) => {
        try {
          // eslint-disable-next-line prefer-const
          let { tableName, id } = params as {
            tableName: string;
            id: number | string;
          };

          if (typeof id === 'string' && !isNaN(Number(id))) {
            id = Number(id);
          }
          const { data } = await json();

          if (!data || typeof data !== 'object') {
            return new Response(
              JSON.stringify({ error: 'Invalid data format' }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          const param: DataMutationParams = {
            tableName: tableName,
            data: data,
            id: id,
          };

          const result = this.db.update(param, userContext, isSystem);

          return new Response(JSON.stringify(result), {
            status: 204,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e) {
          return this.handleError(e);
        }
      }
    );

    this.router.delete(
      '/db/:tableName/:id',
      async ({ params, userContext, isSystem }) => {
        try {
          // eslint-disable-next-line prefer-const
          let { tableName, id } = params as {
            tableName: string;
            id: number | string;
          };
          if (typeof id === 'string' && !isNaN(Number(id))) {
            id = Number(id);
          }

          await this.db.delete(tableName, id, userContext, isSystem);

          return new Response(null, {
            status: 204,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e) {
          return this.handleError(e);
        }
      }
    );
  }

  private schemaRoute() {
    this.router.get('/db/schema', async () => {
      try {
        const res = await this.db.getSchema();
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });

    this.router.get('/db/schema/tables/:tableName', async ({ params }) => {
      try {
        const { tableName } = params;
        const res = await this.db.getTableSchema(tableName);
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });

    this.router.delete('/db/schema/tables/:tableName', async ({ params }) => {
      try {
        const { tableName } = params;
        const res = await this.db.deleteSchema(tableName);
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });

    this.router.get('/db/schema/tables', async () => {
      try {
        const res = await this.db.getTables();
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });

    this.router.post('/db/schema', async ({ json }) => {
      try {
        const { tableName, columns } = await json();
        const res = await this.db.createSchema(tableName, columns);
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });

    this.router.post('/db/schema/column', async ({ json }) => {
      try {
        const { tableName, columns } = await json();
        const res = await this.db.addColumn(tableName, columns);
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });

    this.router.delete('/db/schema/column', async ({ json }) => {
      try {
        const { tableName, columns } = await json();
        const res = await this.db.deleteColumn(tableName, columns);
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });

    this.router.put('/db/schema/column', async ({ json }) => {
      try {
        const { tableName, columns } = await json();
        const res = await this.db.updateColumn(tableName, columns);
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });

    this.router.post('/db/schema/foreign_key', async ({ json }) => {
      try {
        const { tableName, foreignKey } = await json();
        const res = await this.db.addForeignKey(tableName, foreignKey);
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });

    this.router.delete('/db/schema/foreign_key', async ({ json }) => {
      try {
        const { tableName, column } = await json();
        const res = await this.db.dropForeignKey(tableName, column);
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });

    this.router.delete('/db/schema/truncate', async ({ json }) => {
      try {
        const { tableName } = await json();
        const res = await this.db.truncateTable(tableName);
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });
  }

  private permissionRoute() {
    this.router.get('/permissions/:tableName', async ({ params }) => {
      try {
        const { tableName } = params;
        const res = await this.db.getPermissions(tableName);
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });

    this.router.post('/permissions/:tableName', async ({ params, json }) => {
      try {
        const { tableName } = params;
        const { permissions } = await json();
        const res = await this.db.setPermissions(tableName, permissions);
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return this.handleError(e);
      }
    });
  }

  getDatabaseService() {
    return this.db;
  }

  getRoutes(): RouteEntry[] {
    return this.registeredRoutes;
  }

  getRouter(): AutoRouterType<IttyWebRequest> {
    return this.router;
  }

  async handleRequest(req: IttyWebRequest): Promise<Response> {
    return this.router.fetch(req);
  }
}

export function createIttyHandler(options: {
  config: {
    enableSchemaEndpoints?: boolean;
    enableDataEndpoints?: boolean;
    enablePermissionEndpoints?: boolean;
  };
  fgConfig: Partial<BaaSConfig>;
}): IttyWebHandler {
  return new IttyWebHandler(options.config, options.fgConfig);
}
