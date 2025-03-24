/* eslint-disable prefer-const */
import { DataMutationParams, DataQueryParams } from '@forgebase-ts/database';
import { BaaSConfig, Context, Handler, ServerAdapter } from '../types';
import { DatabaseService } from './database';
import { StorageService } from './storage';
import { resolve } from 'path';
import { createRouter, addRoute, findRoute } from 'rou3';

export class ForgeApi {
  private router = createRouter<Handler>();
  private storage: StorageService;
  private db: DatabaseService;
  private config: BaaSConfig;
  private middlewares: Handler[] = [];

  constructor(config: Partial<BaaSConfig> = {}) {
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
          realtime: true,
          enforceRls: true,
          config: {
            filename: resolve(__dirname, '../database.sqlite'),
          },
        },
      },
      ...config,
    };

    this.config = this.mergeConfigs(this.config, config);

    console.log('Initializing Forge API with config:', this.config);

    // Initialize services based on configuration
    this.storage = new StorageService(this.config.services?.storage);
    this.db = new DatabaseService(this.config.services?.db);
    this.registerCoreRoutes();
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

  getStorageService(): StorageService {
    return this.storage;
  }

  getDatabaseService(): DatabaseService {
    return this.db;
  }

  use(middleware: Handler) {
    this.middlewares.push(middleware);
    return this;
  }

  private async runMiddlewares(context: Context) {
    for (const middleware of this.middlewares) {
      await middleware(context);
      if (context.res.body !== null) {
        // If a middleware sets a response, stop processing
        return true;
      }
    }
    return false;
  }

  private async createContext(
    adapter: ServerAdapter,
    isSystem = false
  ): Promise<Context> {
    const headers = adapter.getHeaders();

    const request = {
      params: adapter.getQuery(),
      query: adapter.getQuery(),
      body: await adapter.getBody(),
      headers: headers,
      method: adapter.getMethod(),
      path: adapter.getPath(),
      config: this.config,
      userContext: adapter.getUserContext(),
      isSystem,
    };

    const response = {
      body: null,
      status: 200,
      headers: headers,
    };

    return {
      req: request,
      res: response,
      services: { storage: this.storage, db: this.db },
    };
  }

  async handle(
    adapter: ServerAdapter,
    isSystem = false
  ): Promise<{
    adapter: ServerAdapter;
    context: Context;
  }> {
    const context = await this.createContext(adapter, isSystem);
    const path = adapter.getPath();

    if (this.config.auth.enabled && this.config.auth.beforeMiddleware) {
      const user = context.req.userContext;
      //TODO: future iteration will proper auth checking
      if (!user && !this.config.auth.exclude?.includes(path)) {
        throw new Error('Unauthorized');
      }
    }

    if (await this.runMiddlewares(context)) {
      return { adapter, context };
    }

    if (this.config.auth.enabled && !this.config.auth.beforeMiddleware) {
      const user = context.req.userContext;
      //TODO: future iteration will proper auth checking
      if (!user && !this.config.auth.exclude?.includes(path)) {
        throw new Error('Unauthorized');
      }
    }

    const method = adapter.getMethod();
    const normalizedPath = path.startsWith(this.config.prefix)
      ? path.slice(this.config.prefix.length)
      : path;

    const match = findRoute(this.router, method, normalizedPath, {
      params: true,
    });

    if (!match) {
      throw new Error('No handler found');
    }

    // Add route params to context
    context.req.params = { ...context.req.params, ...match.params };
    await match.data(context);

    if (!context.res.status) {
      context.res.status = 200;
    }

    return { adapter, context };
  }

  getConfig(): BaaSConfig {
    return this.config;
  }

  private registerCoreRoutes() {
    // Built-in storage endpoints
    // addRoute(this.router, 'POST', '/storage/:bucket/:key', async (ctx) => {
    //   const { bucket, key } = ctx.req.params;
    //   await this.storage.upload(bucket, key, ctx.req.body);
    //   ctx.res.status = 201;
    // });

    // addRoute(this.router, 'GET', '/storage/:bucket/:key', async (ctx) => {
    //   const { bucket, key } = ctx.req.params;
    //   ctx.res.body = await this.storage.download(bucket, key);
    // });

    // Built-in database endpoints
    addRoute(this.router, 'POST', '/db/:collection', async (ctx) => {
      const { collection } = ctx.req.params;
      let { data } = ctx.req.body;

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
        collection,
        {
          tableName: collection,
          data,
        },
        ctx.req.userContext,
        ctx.req.isSystem
      );
      ctx.res.body = { id };
      ctx.res.status = 201;
    });

    addRoute(this.router, 'GET', '/db/:collection', async (ctx) => {
      const { collection } = ctx.req.params;
      ctx.res.body = await this.db.query(
        collection,
        ctx.req.query,
        ctx.req.userContext,
        ctx.req.isSystem
      );
    });

    addRoute(this.router, 'GET', '/db/:collection/:id', async (ctx) => {
      let { collection, id } = ctx.req.params;
      // check if id is a number, then convert to number
      if (typeof id === 'string' && !isNaN(Number(id))) {
        id = Number(id);
      }
      const query: DataQueryParams = { filter: { id: id }, select: ['*'] };
      ctx.res.body = await this.db.query(
        collection,
        query,
        ctx.req.userContext,
        ctx.req.isSystem
      );
    });

    addRoute(this.router, 'PUT', '/db/:collection/:id', async (ctx) => {
      let { collection, id } = ctx.req.params;
      let { data } = ctx.req.body;
      // check if id is a number, then convert to number
      if (typeof id === 'string' && !isNaN(Number(id))) {
        id = Number(id);
      }

      // check if data is an object, then convert to object
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      const params: DataMutationParams = {
        tableName: collection,
        data: data,
        id: id,
      };
      await this.db.update(params, ctx.req.userContext, ctx.req.isSystem);
      ctx.res.status = 204;
    });

    addRoute(this.router, 'DELETE', '/db/:collection/:id', async (ctx) => {
      let { collection, id } = ctx.req.params;
      // check if id is a number, then convert to number
      if (typeof id === 'string' && !isNaN(Number(id))) {
        id = Number(id);
      }
      await this.db.delete(
        collection,
        id,
        ctx.req.userContext,
        ctx.req.isSystem
      );
      ctx.res.status = 204;
    });

    addRoute(this.router, 'GET', '/db/schema', async (ctx) => {
      try {
        if (!ctx.req.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        const res = await this.db.getSchema();
        ctx.res.status = 200;
        ctx.res.body = res;
      } catch (error) {
        ctx.res.status = 500;
        ctx.res.body = { error: 'Internal server error' };
      }
    });

    addRoute(
      this.router,
      'GET',
      '/db/schema/tables/:tableName',
      async (ctx) => {
        if (!ctx.req.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        const { tableName } = ctx.req.params;
        ctx.res.body = await this.db.getTableSchema(tableName);
      }
    );

    addRoute(
      this.router,
      'DELETE',
      '/db/schema/tables/:tableName',
      async (ctx) => {
        if (!ctx.req.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        const { tableName } = ctx.req.params;
        ctx.res.body = await this.db.deleteSchema(tableName);
      }
    );

    addRoute(this.router, 'GET', '/db/schema/tables', async (ctx) => {
      if (!ctx.req.isSystem) {
        ctx.res.status = 403;
        ctx.res.body = { error: 'Forbidden' };
        return;
      }
      ctx.res.body = await this.db.getTables();
    });

    addRoute(this.router, 'POST', '/db/schema', async (ctx) => {
      if (!ctx.req.isSystem) {
        ctx.res.status = 403;
        ctx.res.body = { error: 'Forbidden' };
        return;
      }
      const { tableName, columns } = ctx.req.body;
      ctx.res.body = await this.db.createSchema(tableName, columns);
    });

    addRoute(this.router, 'POST', '/db/schema/column', async (ctx) => {
      if (!ctx.req.isSystem) {
        ctx.res.status = 403;
        ctx.res.body = { error: 'Forbidden' };
        return;
      }
      const { tableName, columns } = ctx.req.body;
      ctx.res.body = await this.db.addColumn(tableName, columns);
    });

    addRoute(this.router, 'DELETE', '/db/schema/column', async (ctx) => {
      if (!ctx.req.isSystem) {
        ctx.res.status = 403;
        ctx.res.body = { error: 'Forbidden' };
        return;
      }
      const { tableName, columns } = ctx.req.body;
      ctx.res.body = await this.db.deleteColumn(tableName, columns);
    });

    addRoute(this.router, 'PUT', '/db/schema/column', async (ctx) => {
      if (!ctx.req.isSystem) {
        ctx.res.status = 403;
        ctx.res.body = { error: 'Forbidden' };
        return;
      }
      const { tableName, columns } = ctx.req.body;
      ctx.res.body = await this.db.updateColumn(tableName, columns);
    });

    addRoute(this.router, 'POST', '/db/schema/foreign_key', async (ctx) => {
      if (!ctx.req.isSystem) {
        ctx.res.status = 403;
        ctx.res.body = { error: 'Forbidden' };
        return;
      }
      const { tableName, foreignKey } = ctx.req.body;
      ctx.res.body = await this.db.addForeignKey(tableName, foreignKey);
    });

    addRoute(this.router, 'DELETE', '/db/schema/foreign_key', async (ctx) => {
      if (!ctx.req.isSystem) {
        ctx.res.status = 403;
        ctx.res.body = { error: 'Forbidden' };
        return;
      }
      const { tableName, column } = ctx.req.body;
      ctx.res.body = await this.db.dropForeignKey(tableName, column);
    });

    addRoute(this.router, 'DELETE', '/db/schema/truncate', async (ctx) => {
      if (!ctx.req.isSystem) {
        ctx.res.status = 403;
        ctx.res.body = { error: 'Forbidden' };
        return;
      }
      const { tableName } = ctx.req.body;
      ctx.res.body = await this.db.truncateTable(tableName);
    });

    addRoute(
      this.router,
      'GET',
      '/db/schema/permissions/:tableName',
      async (ctx) => {
        if (!ctx.req.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        const { tableName } = ctx.req.params;
        ctx.res.body = await this.db.getPermissions(tableName);
      }
    );

    addRoute(
      this.router,
      'PUT',
      '/db/schema/permissions/:tableName',
      async (ctx) => {
        if (!ctx.req.isSystem) {
          ctx.res.status = 403;
          ctx.res.body = { error: 'Forbidden' };
          return;
        }
        const { tableName } = ctx.req.params;
        const { permissions } = ctx.req.body;
        ctx.res.body = await this.db.setPermissions(tableName, permissions);
      }
    );
  }

  // Public ForgeApi methods that match your preferred interface
  get(path: string, handler: Handler) {
    addRoute(this.router, 'GET', path, handler);
    return this;
  }

  post(path: string, handler: Handler) {
    addRoute(this.router, 'POST', path, handler);
    return this;
  }

  put(path: string, handler: Handler) {
    addRoute(this.router, 'PUT', path, handler);
    return this;
  }

  delete(path: string, handler: Handler) {
    addRoute(this.router, 'DELETE', path, handler);
    return this;
  }
}
