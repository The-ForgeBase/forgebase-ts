import { DataMutationParams, DataQueryParams } from "database";
import { BaaSConfig, Context, Handler, ServerAdapter } from "../types";
import { DatabaseService } from "./database";
import { StorageService } from "./storage";

export class ForgeApi {
  private routes: Map<string, Map<string, Handler>>;
  private storage: StorageService;
  private db: DatabaseService;
  private config: BaaSConfig;
  private middlewares: Handler[] = [];

  constructor(config: Partial<BaaSConfig> = {}) {
    this.config = {
      prefix: "",
      auth: {
        enabled: false,
        exclude: ["/auth/login", "/auth/register"],
      },
      services: {
        storage: {
          provider: "local",
          config: {},
        },
        db: {
          provider: "sqlite",
          realtime: true,
          enforceRls: true,
          config: {},
        },
      },
      ...config,
    };

    // Merge the provided config with the default config
    this.config = this.mergeConfigs(this.config, config);

    this.routes = new Map();
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

  private async createContext(adapter: ServerAdapter): Promise<Context> {
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

  async handle(adapter: ServerAdapter): Promise<void> {
    const context = await this.createContext(adapter);

    if (await this.runMiddlewares(context)) {
      this.sendResponse(adapter, context);
      return;
    }

    const handler = this.findHandler(adapter.getMethod(), adapter.getPath());
    if (!handler) {
      adapter.setStatus(404);
      adapter.send({ message: "Not found" });
      return;
    }

    try {
      await handler(context);
      this.sendResponse(adapter, context);
    } catch (error) {
      console.error("Handler error:", error);
      adapter.setStatus(500);
      adapter.send({ message: "Internal server error" });
    }
  }

  private sendResponse(adapter: ServerAdapter, context: Context) {
    adapter.setStatus(context.res.status);
    for (const [key, value] of Object.entries(context.res.headers)) {
      adapter.setHeader(key, value);
    }
    adapter.send(context.res.body);
  }

  getConfig(): BaaSConfig {
    return this.config;
  }

  private registerCoreRoutes() {
    // Built-in storage endpoints
    this.post("/storage/:bucket/:key", async (ctx) => {
      const { bucket, key } = ctx.req.params;
      await this.storage.upload(bucket, key, ctx.req.body);
      ctx.res.status = 201;
    });

    this.get("/storage/:bucket/:key", async (ctx) => {
      const { bucket, key } = ctx.req.params;
      ctx.res.body = await this.storage.download(bucket, key);
    });

    // Built-in database endpoints
    this.post("/db/:collection", async (ctx) => {
      const { collection } = ctx.req.params;
      let { data } = ctx.req.body;

      // check if data is an object, then convert to object
      if (typeof data === "string") {
        data = JSON.parse(data);
      }

      const id = await this.db.insert(collection, data, ctx.req.userContext);
      ctx.res.body = { id };
      ctx.res.status = 201;
    });

    this.get("/db/:collection", async (ctx) => {
      const { collection } = ctx.req.params;
      ctx.res.body = await this.db.query(
        collection,
        ctx.req.query,
        ctx.req.userContext
      );
    });

    this.get("/db/:collection/:id", async (ctx) => {
      let { collection, id } = ctx.req.params;
      // check if id is a number, then convert to number
      if (typeof id === "string" && !isNaN(Number(id))) {
        id = Number(id);
      }
      const query: DataQueryParams = { filter: { id: id }, select: ["*"] };
      ctx.res.body = await this.db.query(
        collection,
        query,
        ctx.req.userContext
      );
    });

    this.put("/db/:collection/:id", async (ctx) => {
      let { collection, id } = ctx.req.params;
      let { data } = ctx.req.body;
      // check if id is a number, then convert to number
      if (typeof id === "string" && !isNaN(Number(id))) {
        id = Number(id);
      }

      // check if data is an object, then convert to object
      if (typeof data === "string") {
        data = JSON.parse(data);
      }
      const params: DataMutationParams = {
        tableName: collection,
        data: data,
        id: id,
      };
      await this.db.update(params, ctx.req.userContext);
      ctx.res.status = 204;
    });

    this.delete("/db/:collection/:id", async (ctx) => {
      let { collection, id } = ctx.req.params;
      // check if id is a number, then convert to number
      if (typeof id === "string" && !isNaN(Number(id))) {
        id = Number(id);
      }
      await this.db.delete(collection, id, ctx.req.userContext);
      ctx.res.status = 204;
    });

    this.get("/db/schema", async (ctx) => {
      ctx.res.body = await this.db.getSchema();
    });

    this.post("/db/schema", async (ctx) => {
      const { tableName, columns } = ctx.req.body;
      ctx.res.body = await this.db.creatSchema(tableName, columns);
    });

    this.post("/db/schema/column", async (ctx) => {
      const { tableName, columns } = ctx.req.body;
      ctx.res.body = await this.db.addColumn(tableName, columns);
    });

    this.delete("/db/schema/column", async (ctx) => {
      const { tableName, columns } = ctx.req.body;
      ctx.res.body = await this.db.deleteColumn(tableName, columns);
    });

    this.put("/db/schema/column", async (ctx) => {
      const { tableName, columns } = ctx.req.body;
      ctx.res.body = await this.db.updateColumn(tableName, columns);
    });

    this.post("/db/schema/foreign_key", async (ctx) => {
      const { tableName, foreignKey } = ctx.req.body;
      ctx.res.body = await this.db.addForeignKey(tableName, foreignKey);
    });

    this.delete("/db/schema/foreign_key", async (ctx) => {
      const { tableName, column } = ctx.req.body;
      ctx.res.body = await this.db.dropForeignKey(tableName, column);
    });

    this.delete("/db/schema/truncate", async (ctx) => {
      const { tableName } = ctx.req.body;
      ctx.res.body = await this.db.truncateTable(tableName);
    });

    this.get("/db/schema/permissions/:tableName", async (ctx) => {
      const { tableName } = ctx.req.params;
      ctx.res.body = await this.db.getPermissions(tableName);
    });

    this.put("/db/schema/permissions/:tableName", async (ctx) => {
      const { tableName } = ctx.req.params;
      const { permissions } = ctx.req.body;
      ctx.res.body = await this.db.setPermissions(tableName, permissions);
    });
  }

  private addRoute(method: string, path: string, handler: Handler) {
    if (!this.routes.has(method)) {
      this.routes.set(method, new Map());
    }

    this.routes.get(method)!.set(path, handler);
  }

  // Public ForgeApi methods that match your preferred interface
  get(path: string, handler: Handler) {
    this.addRoute("GET", path, handler);
    return this;
  }

  post(path: string, handler: Handler) {
    this.addRoute("POST", path, handler);
    return this;
  }

  put(path: string, handler: Handler) {
    this.addRoute("PUT", path, handler);
    return this;
  }

  delete(path: string, handler: Handler) {
    this.addRoute("DELETE", path, handler);
    return this;
  }

  private findHandler(method: string, path: string): Handler | undefined {
    const methodRoutes = this.routes.get(method);
    if (!methodRoutes) return undefined;

    // Find matching route pattern
    for (const [pattern, handler] of methodRoutes.entries()) {
      if (this.matchPath(pattern, path)) {
        return handler;
      }
    }

    return undefined;
  }

  private matchPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split("/");
    const pathParts = path.split("/");

    if (patternParts.length !== pathParts.length) return false;

    return patternParts.every((part, i) => {
      if (part.startsWith(":")) return true;
      return part === pathParts[i];
    });
  }
}
