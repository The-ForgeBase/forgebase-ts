import { BaaSConfig, WebHandler as WT, WebContext } from '../../types';
import {
  AuthenticationRequiredError,
  DataMutationParams,
  DataQueryParams,
  ExcludedTableError,
  PermissionDeniedError,
  UserContext,
} from '@forgebase-ts/database';
// import { StorageService } from '../storage';
import { DatabaseService } from '../database';

export async function createWebHandler(options: {
  config: {
    enableSchemaEndpoints?: boolean;
    enableDataEndpoints?: boolean;
    enablePermissionEndpoints?: boolean;
  };
  fgConfig: Partial<BaaSConfig>;
}) {
  const { createRouter, addRoute, findRoute, findAllRoutes } = await import(
    'rou3'
  );

  class WebHandler {
    enableSchemaEndpoints = true;
    enableDataEndpoints = true;
    enablePermissionEndpoints = true;
    router = createRouter<WT>();
    config: BaaSConfig;
    // private storage: StorageService;
    db: DatabaseService;

    constructor(
      config: {
        enableSchemaEndpoints?: boolean;
        enableDataEndpoints?: boolean;
        enablePermissionEndpoints?: boolean;
      },
      fgConfig: Partial<BaaSConfig> = {}
    ) {
      this.enableSchemaEndpoints = config?.enableSchemaEndpoints || true;
      this.enableDataEndpoints = config?.enableDataEndpoints || true;
      this.enablePermissionEndpoints =
        config?.enablePermissionEndpoints || true;
      this.config = {
        prefix: '',
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
      this.config = this.mergeConfigs(this.config, fgConfig);
      // Initialize services based on configuration
      // this.storage = new StorageService(this.config.services?.storage);
      this.db = new DatabaseService(this.config.services?.db);
      this.setupRoutes();

      const allRoutes = findAllRoutes(this.router, undefined, '/', {
        params: true,
      });

      console.log('All Fg Routes:', allRoutes);
    }

    mergeConfigs(
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

    handleError(error: unknown, ctx: WebContext) {
      if (error instanceof ExcludedTableError) {
        ctx.res.status = 403;
        ctx.res.body = {
          error: 'Forbidden',
          message: 'table does not exist',
        };
        return;
      } else if (
        error instanceof AuthenticationRequiredError ||
        error instanceof PermissionDeniedError
      ) {
        ctx.res.status = 401;
        ctx.res.body = { error: error.message };
        return;
      } else if (error instanceof Error) {
        ctx.res.status = 500;
        ctx.res.body = { error: error.message };
        return;
      } else {
        ctx.res.status = 500;
        ctx.res.body = { error: 'Internal server error' };
      }
    }

    setupRoutes() {
      // Built-in database endpoints
      if (this.enableDataEndpoints) {
        this.dataRoutes();
      }

      // Built-in schema endpoints
      if (this.enableSchemaEndpoints) {
        this.schemaRoutes();
      }

      // Built-in permission endpoints
      if (this.enablePermissionEndpoints) {
        this.permissionRoutes();
      }
    }

    dataRoutes() {
      addRoute(this.router, 'POST', '/db/:tableName', async (ctx) => {
        const { tableName } = ctx.params;
        try {
          let { data } = await ctx.req.json();

          // check if data is an object, then convert to object
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }

          if (!data || typeof data !== 'object') {
            ctx.res.status = 400;
            ctx.res.body = { error: 'Invalid data provided' };
            return;
          }

          const id = await this.db.insert(
            tableName,
            {
              tableName: tableName,
              data,
            },
            ctx.userContext,
            ctx.isSystem
          );
          ctx.res.body = { id };
          ctx.res.status = 201;
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(this.router, 'GET', '/db/:tableName', async (ctx) => {
        const { tableName } = ctx.params;
        try {
          ctx.res.body = await this.db.query(
            tableName,
            ctx.query,
            ctx.userContext,
            ctx.isSystem
          );
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(this.router, 'GET', '/db/:tableName/:id', async (ctx) => {
        // eslint-disable-next-line prefer-const
        let { tableName, id } = ctx.params;
        try {
          // check if id is a number, then convert to number
          if (typeof id === 'string' && !isNaN(Number(id))) {
            id = Number(id);
          }
          const query: DataQueryParams = { filter: { id: id }, select: ['*'] };
          ctx.res.body = await this.db.query(
            tableName,
            query,
            ctx.userContext,
            ctx.isSystem
          );
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(this.router, 'PUT', '/db/:tableName/:id', async (ctx) => {
        // eslint-disable-next-line prefer-const
        let { tableName, id } = ctx.params;
        try {
          let { data } = await ctx.req.json();
          // check if id is a number, then convert to number
          if (typeof id === 'string' && !isNaN(Number(id))) {
            id = Number(id);
          }

          // check if data is an object, then convert to object
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          const params: DataMutationParams = {
            tableName: tableName,
            data: data,
            id: id,
          };
          await this.db.update(params, ctx.userContext, ctx.isSystem);
          ctx.res.status = 204;
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(this.router, 'DELETE', '/db/:tableName/:id', async (ctx) => {
        // eslint-disable-next-line prefer-const
        let { tableName, id } = ctx.params;
        try {
          // check if id is a number, then convert to number
          if (typeof id === 'string' && !isNaN(Number(id))) {
            id = Number(id);
          }
          await this.db.delete(tableName, id, ctx.userContext, ctx.isSystem);
          ctx.res.status = 204;
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });
    }

    schemaRoutes() {
      addRoute(this.router, 'GET', '/db/schema', async (ctx) => {
        try {
          if (!ctx.isSystem) {
            ctx.res.status = 403;
            ctx.res.body = { error: 'Forbidden' };
            return;
          }
          const res = await this.db.getSchema();
          ctx.res.status = 200;
          ctx.res.body = res;
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(
        this.router,
        'GET',
        '/db/schema/tables/:tableName',
        async (ctx) => {
          if (!ctx.isSystem) {
            ctx.res.status = 403;
            ctx.res.body = { error: 'Forbidden' };
            return;
          }
          const { tableName } = ctx.params;
          try {
            ctx.res.body = await this.db.getTableSchema(tableName);
          } catch (error) {
            return this.handleError(error, ctx);
          }
        }
      );

      addRoute(
        this.router,
        'DELETE',
        '/db/schema/tables/:tableName',
        async (ctx) => {
          if (!ctx.isSystem) {
            ctx.res.status = 403;
            ctx.res.body = { error: 'Forbidden' };
            return;
          }
          const { tableName } = ctx.params;
          try {
            ctx.res.body = await this.db.deleteSchema(tableName);
          } catch (error) {
            return this.handleError(error, ctx);
          }
        }
      );

      addRoute(this.router, 'GET', '/db/schema/tables', async (ctx) => {
        if (!ctx.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        try {
          ctx.res.body = await this.db.getTables();
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(this.router, 'POST', '/db/schema', async (ctx) => {
        if (!ctx.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        const { tableName, columns } = await ctx.req.json();
        try {
          ctx.res.body = await this.db.createSchema(tableName, columns);
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(this.router, 'POST', '/db/schema/column', async (ctx) => {
        if (!ctx.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        const { tableName, columns } = await ctx.req.json();
        try {
          ctx.res.body = await this.db.addColumn(tableName, columns);
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(this.router, 'DELETE', '/db/schema/column', async (ctx) => {
        if (!ctx.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        const { tableName, columns } = await ctx.req.json();
        try {
          ctx.res.body = await this.db.deleteColumn(tableName, columns);
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(this.router, 'PUT', '/db/schema/column', async (ctx) => {
        if (!ctx.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        const { tableName, columns } = await ctx.req.json();
        try {
          ctx.res.body = await this.db.updateColumn(tableName, columns);
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(this.router, 'POST', '/db/schema/foreign_key', async (ctx) => {
        if (!ctx.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        const { tableName, foreignKey } = await ctx.req.json();
        try {
          ctx.res.body = await this.db.addForeignKey(tableName, foreignKey);
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(this.router, 'DELETE', '/db/schema/foreign_key', async (ctx) => {
        if (!ctx.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        const { tableName, column } = await ctx.req.json();
        try {
          ctx.res.body = await this.db.dropForeignKey(tableName, column);
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(this.router, 'DELETE', '/db/schema/truncate', async (ctx) => {
        if (!ctx.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        const { tableName } = await ctx.req.json();
        try {
          ctx.res.body = await this.db.truncateTable(tableName);
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });
    }

    permissionRoutes() {
      addRoute(this.router, 'GET', '/permissions/:tableName', async (ctx) => {
        const { tableName } = ctx.params;
        try {
          ctx.res.body = await this.db.getPermissions(tableName);
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });

      addRoute(this.router, 'POST', '/permissions/:tableName', async (ctx) => {
        const { tableName } = ctx.params;
        try {
          const { permissions } = await ctx.req.json();
          ctx.res.body = await this.db.setPermissions(tableName, permissions);
        } catch (error) {
          return this.handleError(error, ctx);
        }
      });
    }

    async handleRequest(
      req: Request,
      userContext: UserContext,
      isSystem: boolean
    ): Promise<Response> {
      const { pathname, searchParams } = new URL(req.url);
      const context: WebContext = {
        req: req,
        userContext: userContext,
        isSystem: isSystem,
        params: {},
        query: Object.fromEntries(searchParams),
        res: {
          body: null,
          status: 200,
          headers: {},
        },
      };
      if (this.config.auth.enabled && this.config.auth.beforeMiddleware) {
        const user = context.userContext;
        //TODO: future iteration will proper auth checking
        if (!user && !this.config.auth.exclude?.includes(pathname)) {
          return new Response('Unauthorized', { status: 401 });
        }
      }
      const method = req.method;
      const normalizedPath = pathname.startsWith(this.config.prefix)
        ? pathname.slice(this.config.prefix.length)
        : pathname;
      const route = findRoute(this.router, method, normalizedPath, {
        params: true,
      });
      if (!route) {
        return new Response('Not found', { status: 404 });
      }

      await route.data({
        ...context,
        params: route.params,
      });

      if (!context.res) {
        return new Response('Internal Server Error', { status: 500 });
      }

      return new Response(JSON.stringify(context.res.body), {
        status: context.res.status,
        headers: context.res.headers,
      });
    }

    getDatabaseService() {
      return this.db;
    }
  }
  return new WebHandler(options.config, options.fgConfig);
}
